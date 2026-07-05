// ============================================================
//  █████╗ ██╗     ██████╗  ██████╗ ██╗    ██╗██████╗ ██╗   ██╗
// ██╔══██╗██║     ██╔══██╗██╔═══██╗██║    ██║██╔══██╗╚██╗ ██╔╝
// ███████║██║     ██████╔╝██║   ██║██║ █╗ ██║██████╔╝ ╚████╔╝ 
// ██╔══██║██║     ██╔══██╗██║   ██║██║███╗██║██╔══██╗  ╚██╔╝  
// ██║  ██║███████╗██████╔╝╚██████╔╝╚███╔███╔╝██║  ██║   ██║   
// ╚═╝  ╚═╝╚══════╝╚═════╝  ╚═════╝  ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝  
//
// GOOGLE APPS SCRIPT — ENTERPRISE BACKEND
// Handles: PDF Storage, Invoice Logging, Client DB, Logo Serving
// ============================================================

// ═══════════════════════════════════════════
// 🔧 CONFIGURATION
// ═══════════════════════════════════════════
var FOLDER_ID    = "1vhGITWo4LE2ZIVBbuEl226qBV2VDCWU5";
var LOGO_FILE_ID = "1ZWhnx4XPyTzQcDFsDVL0sUxun8sv2Vx4";
var DB_NAME      = "Albowry - Master Database";

// ═══════════════════════════════════════════
// 📨 POST HANDLER (Main Router)
// ═══════════════════════════════════════════
function doPost(e) {
    try {
        var data   = JSON.parse(e.postData.contents);
        var action = data.action || "saveInvoice";

        switch(action) {
            case "saveInvoice":  return handleSaveInvoice(data);
            case "getLogo":      return handleGetLogo();
            case "getClients":   return handleGetClients();
            case "saveClient":   return handleSaveClient(data);
            case "deleteClient": return handleDeleteClient(data);
            case "getInvoices":  return handleGetInvoices();
            default:             return respond({ status: "error", message: "Unknown action: " + action });
        }

    } catch(err) {
        Logger.log("❌ POST Error: " + err.toString());
        return respond({ status: "error", message: err.toString() });
    }
}

// ═══════════════════════════════════════════
// 🌐 GET HANDLER
// ═══════════════════════════════════════════
function doGet(e) {
    var action = (e.parameter || {}).action || "status";

    switch(action) {
        case "logo":     return handleGetLogo();
        case "clients":  return handleGetClients();
        case "invoices": return handleGetInvoices();
        case "health":   return respond({
            status: "healthy",
            uptime: new Date().toISOString(),
            version: "3.0.0"
        });
        default: return respond({
            status: "active",
            message: "🚀 Albowry Carpentry LLC — Invoice API v3.0",
            company: "Albowry Carpentry LLC",
            location: "Dubai, UAE",
            endpoints: {
                POST: ["saveInvoice", "getLogo", "getClients", "saveClient", "deleteClient"],
                GET:  ["logo", "clients", "invoices", "health"]
            },
            timestamp: new Date().toISOString()
        });
    }
}

// ═══════════════════════════════════════════
// 💾 SAVE INVOICE (PDF → Drive + Log)
// ═══════════════════════════════════════════
function handleSaveInvoice(data) {
    var fileName    = data.fileName    || "Invoice.pdf";
    var pdfBase64   = data.pdfBase64   || "";
    var invoiceData = {};

    try { invoiceData = JSON.parse(data.invoiceData || "{}"); } catch(e) {}

    // Get main folder
    var mainFolder = DriveApp.getFolderById(FOLDER_ID);
    
    // Create organized folder structure: Year → Month → PDF
    var now        = new Date();
    var year       = String(now.getFullYear());
    var monthNames = ["01-January","02-February","03-March","04-April","05-May","06-June",
                      "07-July","08-August","09-September","10-October","11-November","12-December"];
    var yearFolder  = getOrCreateSubFolder(mainFolder, year);
    var monthFolder = getOrCreateSubFolder(yearFolder, monthNames[now.getMonth()]);

    // Create client subfolder
    var clientName = (invoiceData.toName || "General").replace(/[^a-zA-Z0-9 ]/g, "").trim() || "General";
    var clientFolder = getOrCreateSubFolder(monthFolder, clientName);

    // Save PDF
    var pdfBytes = Utilities.base64Decode(pdfBase64);
    var pdfBlob  = Utilities.newBlob(pdfBytes, "application/pdf", fileName);
    var savedFile = clientFolder.createFile(pdfBlob);
    savedFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var fileUrl     = savedFile.getUrl();
    var fileId      = savedFile.getId();
    var downloadUrl = "https://drive.google.com/uc?export=download&id=" + fileId;
    var viewUrl     = "https://drive.google.com/file/d/" + fileId + "/view";

    // Log to spreadsheet
    logInvoice(invoiceData, fileName, fileUrl, fileId);

    // Auto-save client
    if (invoiceData.toName) {
        autoSaveClient(invoiceData);
    }

    return respond({
        status:      "success",
        message:     "✅ Invoice saved successfully!",
        fileUrl:     fileUrl,
        downloadUrl: downloadUrl,
        viewUrl:     viewUrl,
        fileName:    fileName,
        fileId:      fileId,
        folder:      clientFolder.getName(),
        timestamp:   new Date().toISOString()
    });
}

// ═══════════════════════════════════════════
// 🖼️ GET LOGO AS BASE64
// ═══════════════════════════════════════════
function handleGetLogo() {
    try {
        var file = DriveApp.getFileById(LOGO_FILE_ID);
        var blob = file.getBlob();
        var b64  = Utilities.base64Encode(blob.getBytes());
        var mime = blob.getContentType();
        
        return respond({
            status: "success",
            logo:   "data:" + mime + ";base64," + b64,
            mime:   mime,
            size:   blob.getBytes().length
        });
    } catch(e) {
        Logger.log("❌ Logo Error: " + e.toString());
        return respond({ status: "error", message: "Logo not found: " + e.toString() });
    }
}

// ═══════════════════════════════════════════
// 👥 CLIENT MANAGEMENT
// ═══════════════════════════════════════════
function handleGetClients() {
    try {
        var ss    = getDatabase();
        var sheet = ss.getSheetByName("Clients");
        if (!sheet) return respond({ status: "success", clients: [] });

        var data    = sheet.getDataRange().getValues();
        var clients = [];
        
        for (var i = 1; i < data.length; i++) {
            if (!data[i][1]) continue; // Skip empty names
            clients.push({
                id:         data[i][0] || "",
                name:       data[i][1] || "",
                contact:    data[i][2] || "",
                email:      data[i][3] || "",
                phone:      data[i][4] || "",
                trn:        data[i][5] || "",
                address:    data[i][6] || "",
                invoices:   data[i][7] || 0,
                totalSpent: data[i][8] || 0,
                created:    data[i][9]  || "",
                updated:    data[i][10] || ""
            });
        }

        return respond({ status: "success", clients: clients, count: clients.length });

    } catch(e) {
        return respond({ status: "error", message: e.toString() });
    }
}

function handleSaveClient(data) {
    try {
        var client = data.client || data;
        if (!client.name && !client.toName) {
            return respond({ status: "error", message: "Client name required" });
        }
        autoSaveClient(client);
        return respond({ status: "success", message: "Client saved!" });
    } catch(e) {
        return respond({ status: "error", message: e.toString() });
    }
}

function handleDeleteClient(data) {
    try {
        var ss    = getDatabase();
        var sheet = ss.getSheetByName("Clients");
        if (!sheet) return respond({ status: "error", message: "No clients sheet" });

        var rows = sheet.getDataRange().getValues();
        for (var i = rows.length - 1; i >= 1; i--) {
            if (rows[i][0] === data.clientId) {
                sheet.deleteRow(i + 1);
                return respond({ status: "success", message: "Client deleted" });
            }
        }
        return respond({ status: "error", message: "Client not found" });

    } catch(e) {
        return respond({ status: "error", message: e.toString() });
    }
}

// ═══════════════════════════════════════════
// 📊 GET ALL INVOICES FROM LOG
// ═══════════════════════════════════════════
function handleGetInvoices() {
    try {
        var ss    = getDatabase();
        var sheet = ss.getSheetByName("Invoice Log");
        if (!sheet) return respond({ status: "success", invoices: [] });

        var data     = sheet.getDataRange().getValues();
        var invoices = [];

        for (var i = 1; i < data.length; i++) {
            invoices.push({
                timestamp:  data[i][0],
                invNo:      data[i][1],
                date:       data[i][2],
                dueDate:    data[i][3],
                company:    data[i][4],
                trn:        data[i][5],
                client:     data[i][6],
                clientTrn:  data[i][7],
                currency:   data[i][8],
                subtotal:   data[i][9],
                vat:        data[i][10],
                discount:   data[i][11],
                grandTotal: data[i][12],
                status:     data[i][13],
                items:      data[i][14],
                fileName:   data[i][15],
                driveLink:  data[i][16],
                fileId:     data[i][17]
            });
        }

        return respond({ status: "success", invoices: invoices, count: invoices.length });

    } catch(e) {
        return respond({ status: "error", message: e.toString() });
    }
}

// ═══════════════════════════════════════════
// 📝 LOG INVOICE TO SHEET
// ═══════════════════════════════════════════
function logInvoice(d, fileName, fileUrl, fileId) {
    try {
        var ss    = getDatabase();
        var sheet = ss.getSheetByName("Invoice Log");

        if (!sheet) {
            sheet = ss.insertSheet("Invoice Log");
            var headers = [
                "Timestamp", "Invoice No", "Date", "Due Date",
                "Company", "Company TRN", "Client", "Client TRN",
                "Currency", "Subtotal", "VAT", "Discount",
                "Grand Total", "Status", "Items Count",
                "File Name", "Drive Link", "File ID"
            ];
            sheet.appendRow(headers);
            styleHeaderRow(sheet, headers.length);
            sheet.setFrozenRows(1);
            
            // Set column widths
            sheet.setColumnWidth(1, 160);  // Timestamp
            sheet.setColumnWidth(2, 120);  // Invoice No
            sheet.setColumnWidth(7, 180);  // Client
            sheet.setColumnWidth(13, 130); // Grand Total
            sheet.setColumnWidth(17, 250); // Drive Link
        }

        var itemCount = 0;
        try { itemCount = d.items ? d.items.length : 0; } catch(e) {}

        var newRow = [
            new Date(),
            d.invNo      || "",
            d.invDate    || "",
            d.dueDate    || "",
            d.fromName   || "",
            d.fromTrn    || "",
            d.toName     || "",
            d.toTrn      || "",
            d.currency   || "AED",
            d.subtotal   || "0",
            d.vatTotal   || "0",
            d.itemDiscTotal || "0",
            d.grandTotal || "0",
            (d.status    || "pending").toUpperCase(),
            itemCount,
            fileName,
            fileUrl,
            fileId || ""
        ];

        sheet.appendRow(newRow);

        // Style data row (alternating colors)
        var lastRow = sheet.getLastRow();
        var range   = sheet.getRange(lastRow, 1, 1, newRow.length);
        
        if (lastRow % 2 === 0) {
            range.setBackground("#f8f9fa");
        }

        // Color status cell
        var statusCell = sheet.getRange(lastRow, 14);
        var status = (d.status || "pending").toLowerCase();
        if (status === "paid")       statusCell.setBackground("#d4edda").setFontColor("#155724");
        if (status === "pending")    statusCell.setBackground("#fff3cd").setFontColor("#856404");
        if (status === "overdue")    statusCell.setBackground("#f8d7da").setFontColor("#721c24");
        if (status === "cancelled")  statusCell.setBackground("#e2e3e5").setFontColor("#383d41");

        // Make Drive link clickable
        var linkCell = sheet.getRange(lastRow, 17);
        if (fileUrl) {
            linkCell.setFormula('=HYPERLINK("' + fileUrl + '","📂 Open PDF")');
            linkCell.setFontColor("#0d6efd");
        }

        // Auto-resize
        try { sheet.autoResizeColumns(1, newRow.length); } catch(e) {}

        // Update dashboard sheet
        updateDashboardSheet(ss);

    } catch(e) {
        Logger.log("📝 Log Error: " + e.toString());
    }
}

// ═══════════════════════════════════════════
// 👤 AUTO-SAVE CLIENT
// ═══════════════════════════════════════════
function autoSaveClient(d) {
    var clientName = d.toName || d.name || "";
    if (!clientName) return;

    try {
        var ss    = getDatabase();
        var sheet = ss.getSheetByName("Clients");

        if (!sheet) {
            sheet = ss.insertSheet("Clients");
            var headers = [
                "Client ID", "Company Name", "Contact Person", "Email",
                "Phone", "TRN", "Address", "Total Invoices",
                "Total Spent (AED)", "First Created", "Last Updated"
            ];
            sheet.appendRow(headers);
            styleHeaderRow(sheet, headers.length);
            sheet.setFrozenRows(1);
        }

        // Check if client already exists
        var data     = sheet.getDataRange().getValues();
        var foundRow = -1;

        for (var i = 1; i < data.length; i++) {
            if (String(data[i][1]).toLowerCase().trim() === clientName.toLowerCase().trim()) {
                foundRow = i + 1;
                break;
            }
        }

        if (foundRow > 0) {
            // Update existing client
            sheet.getRange(foundRow, 3).setValue(d.toContact || d.contact || data[foundRow-1][2]);
            sheet.getRange(foundRow, 4).setValue(d.toEmail   || d.email   || data[foundRow-1][3]);
            sheet.getRange(foundRow, 5).setValue(d.toPhone   || d.phone   || data[foundRow-1][4]);
            sheet.getRange(foundRow, 6).setValue(d.toTrn     || d.trn     || data[foundRow-1][5]);
            sheet.getRange(foundRow, 7).setValue(d.toAddr    || d.address || d.addr || data[foundRow-1][6]);
            
            // Increment invoice count
            var currentCount = Number(data[foundRow-1][7]) || 0;
            sheet.getRange(foundRow, 8).setValue(currentCount + 1);
            
            // Add to total spent
            var currentSpent = Number(data[foundRow-1][8]) || 0;
            var newSpent     = Number(d.grandTotal) || 0;
            sheet.getRange(foundRow, 9).setValue(currentSpent + newSpent);
            
            sheet.getRange(foundRow, 11).setValue(new Date());
        } else {
            // Create new client
            var clientId = "CLI-" + new Date().getTime();
            sheet.appendRow([
                clientId,
                clientName,
                d.toContact || d.contact || "",
                d.toEmail   || d.email   || "",
                d.toPhone   || d.phone   || "",
                d.toTrn     || d.trn     || "",
                d.toAddr    || d.address || d.addr || "",
                1,
                Number(d.grandTotal) || 0,
                new Date(),
                new Date()
            ]);

            // Style new row
            var lastRow = sheet.getLastRow();
            if (lastRow % 2 === 0) {
                sheet.getRange(lastRow, 1, 1, 11).setBackground("#f0f7ff");
            }
        }

    } catch(e) {
        Logger.log("👤 Client Save Error: " + e.toString());
    }
}

// ═══════════════════════════════════════════
// 📊 UPDATE DASHBOARD SHEET
// ═══════════════════════════════════════════
function updateDashboardSheet(ss) {
    try {
        var sheet = ss.getSheetByName("Dashboard");
        if (!sheet) {
            sheet = ss.insertSheet("Dashboard");
            sheet.getRange("A1").setValue("📊 ALBOWRY INVOICE DASHBOARD");
            sheet.getRange("A1").setFontSize(16).setFontWeight("bold").setFontColor("#c8a14e");
            sheet.getRange("A1:F1").merge().setBackground("#0c1829");
            
            sheet.getRange("A3").setValue("Total Invoices");
            sheet.getRange("A4").setValue("Total Revenue");
            sheet.getRange("A5").setValue("Total Clients");
            sheet.getRange("A6").setValue("Last Updated");
            
            sheet.getRange("A3:A6").setFontWeight("bold");
            sheet.setColumnWidth(1, 180);
            sheet.setColumnWidth(2, 200);
        }

        var logSheet = ss.getSheetByName("Invoice Log");
        var clientSheet = ss.getSheetByName("Clients");
        
        var totalInvoices = logSheet ? Math.max(0, logSheet.getLastRow() - 1) : 0;
        var totalClients  = clientSheet ? Math.max(0, clientSheet.getLastRow() - 1) : 0;
        
        // Calculate revenue
        var totalRevenue = 0;
        if (logSheet && totalInvoices > 0) {
            var amounts = logSheet.getRange(2, 13, totalInvoices, 1).getValues();
            for (var i = 0; i < amounts.length; i++) {
                totalRevenue += Number(amounts[i][0]) || 0;
            }
        }

        sheet.getRange("B3").setValue(totalInvoices);
        sheet.getRange("B4").setValue("AED " + totalRevenue.toFixed(2));
        sheet.getRange("B5").setValue(totalClients);
        sheet.getRange("B6").setValue(new Date());
        
        sheet.getRange("B3:B6").setFontWeight("bold").setFontSize(12);

    } catch(e) {
        Logger.log("Dashboard Error: " + e.toString());
    }
}

// ═══════════════════════════════════════════
// 🛠️ HELPER FUNCTIONS
// ═══════════════════════════════════════════

function getOrCreateSubFolder(parent, name) {
    var folders = parent.getFoldersByName(name);
    if (folders.hasNext()) return folders.next();
    var newFolder = parent.createFolder(name);
    return newFolder;
}

function getDatabase() {
    var folder = DriveApp.getFolderById(FOLDER_ID);
    var files  = folder.getFilesByName(DB_NAME);
    
    if (files.hasNext()) {
        return SpreadsheetApp.openById(files.next().getId());
    }

    // Create new database
    var ss      = SpreadsheetApp.create(DB_NAME);
    var ssFile  = DriveApp.getFileById(ss.getId());
    folder.addFile(ssFile);
    
    try { DriveApp.getRootFolder().removeFile(ssFile); } catch(e) {}
    
    // Rename default sheet
    var defaultSheet = ss.getSheets()[0];
    defaultSheet.setName("Dashboard");
    
    return ss;
}

function styleHeaderRow(sheet, cols) {
    var range = sheet.getRange(1, 1, 1, cols);
    range.setBackground("#0c1829");
    range.setFontColor("#c8a14e");
    range.setFontWeight("bold");
    range.setFontSize(10);
    range.setHorizontalAlignment("center");
    range.setVerticalAlignment("middle");
    sheet.setRowHeight(1, 40);
    
    // Add filter
    try { range.createFilter(); } catch(e) {}
}

function respond(obj) {
    return ContentService
        .createTextOutput(JSON.stringify(obj))
        .setMimeType(ContentService.MimeType.JSON);
}

// ═══════════════════════════════════════════
// 🧹 MAINTENANCE FUNCTIONS (Run manually)
// ═══════════════════════════════════════════

function cleanupDatabase() {
    var ss = getDatabase();
    var sheets = ss.getSheets();
    sheets.forEach(function(sheet) {
        try { sheet.autoResizeColumns(1, sheet.getLastColumn()); } catch(e) {}
    });
    Logger.log("✅ Database cleanup complete!");
}

function testAPI() {
    Logger.log("🔌 API Test Started...");
    Logger.log("📁 Folder ID: " + FOLDER_ID);
    
    try {
        var folder = DriveApp.getFolderById(FOLDER_ID);
        Logger.log("✅ Folder found: " + folder.getName());
    } catch(e) {
        Logger.log("❌ Folder error: " + e.toString());
    }

    try {
        var logo = DriveApp.getFileById(LOGO_FILE_ID);
        Logger.log("✅ Logo found: " + logo.getName() + " (" + logo.getSize() + " bytes)");
    } catch(e) {
        Logger.log("❌ Logo error: " + e.toString());
    }

    Logger.log("🔌 API Test Complete!");
}