const express = require("express");
const sql = require("mssql");

const app = express();
app.use(express.json());

// Database Connection Configurations
const dbConfig = {
  user: "admin2",
  password: "reset@123",
  server: "REP-TRACE",
  database: "replus_treceability",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const CellSortingConfig = {
  user: "ReplusUser",
  password: "ReplusPwd",
  server: "10.5.3.10",
  database: "REPLUSBATTDB_V0100",
  options: {
    encrypt: false, // Set to true if using SSL
    trustServerCertificate: false, // Set to true if using self-signed certificates
  },
};

// Initialize database connection pools
const mainPool = new sql.ConnectionPool(dbConfig);
const cellSortingPool = new sql.ConnectionPool(CellSortingConfig);

const mainPoolConnect = mainPool.connect();
const cellSortingPoolConnect = cellSortingPool.connect();

// // Helper function to query main database
// async function queryMainDatabase(query) {
//   await mainPoolConnect;
//   const request = new sql.Request(mainPool);
//   return request.query(query);
// }

// // Helper function to query CellSorting database
// async function queryCellSortingDatabase(query) {
//   await cellSortingPoolConnect;
//   const request = new sql.Request(cellSortingPool);
//   return request.query(query);
// }


async function queryMainDatabase(query) {
  try {
    await mainPoolConnect;
    const request = new sql.Request(mainPool);
    return await request.query(query);
  } catch (err) {
    console.error("Error querying main database:", err.message);
    throw new Error("Main database query failed.");
  }
}

async function queryCellSortingDatabase(query) {
  try {
    await cellSortingPoolConnect;
    const request = new sql.Request(cellSortingPool);
    return await request.query(query);
  } catch (err) {
    console.error("Error querying CellSorting database:", err.message);
    throw new Error("CellSorting database query failed.");
  }
}
// API to check barcode and count entries
app.post("/checkBarcode", async (req, res) => {
  const { scannedBarcode } = req.body;

  // Log the received barcode for debugging
  console.log("scannedBarcode:", scannedBarcode);

  // Validate the scanned barcode
  if (!scannedBarcode || scannedBarcode.length < 6) {
    return res.status(400).json({ error: "Invalid barcode provided." });
  }

  try {
// Delete existing entries from backup
const DELETEcellSortingQuery = `DELETE FROM cell_sorting_backup WHERE ModuleCode = @ScannedBarcode`;
const deleteRequest = new sql.Request(mainPool);
await deleteRequest.input("ScannedBarcode", sql.VarChar(50), scannedBarcode).query(DELETEcellSortingQuery);
console.log(`Deleted records from cell_sorting_backup for ModuleCode: ${scannedBarcode}`);

// Fetch records from CellSorting database
const cellSortingQuery = `SELECT * FROM TblBatteryReports WHERE ModuleCode = @ScannedBarcode`;
const cellSortingRequest = new sql.Request(cellSortingPool);
const cellSortingResult = await cellSortingRequest.input("ScannedBarcode", sql.VarChar(50), scannedBarcode).query(cellSortingQuery);

const records = cellSortingResult.recordset;
console.log(`Fetched ${records.length} records from TblBatteryReports for ModuleCode: ${scannedBarcode}`);

// Insert records into backup
if (records.length > 0) {
  const insertQuery = `
    INSERT INTO [dbo].[cell_sorting_backup]
    ([ModelName], [TraceabilityCode], [InwardScanTime], [MeasuredHeight], [MeasuredWidth], 
     [MeasuredLength], [MeasuredVoltage], [MeasuredResistance], [Grade], [Conveyor], 
     [PackingTime], [ModuleCode], [ResultCode], [Remark])
    VALUES 
    (@ModelName, @TraceabilityCode, @InwardScanTime, @MeasuredHeight, @MeasuredWidth, 
     @MeasuredLength, @MeasuredVoltage, @MeasuredResistance, @Grade, @Conveyor, 
     @PackingTime, @ModuleCode, @ResultCode, @Remark)`;

  let insertedCount = 0; // Counter for inserted records
  for (const record of records) {
    const insertRequest = new sql.Request(mainPool);
    await insertRequest
      .input("ModelName", sql.VarChar(25), record.ModelName)
      .input("TraceabilityCode", sql.VarChar(50), record.TraceabilityCode)
      .input("InwardScanTime", sql.DateTime, record.InwardScanTime)
      .input("MeasuredHeight", sql.Float, record.MeasuredHeight)
      .input("MeasuredWidth", sql.Float, record.MeasuredWidth)
      .input("MeasuredLength", sql.Float, record.MeasuredLength)
      .input("MeasuredVoltage", sql.Float, record.MeasuredVoltage)
      .input("MeasuredResistance", sql.Float, record.MeasuredResistance)
      .input("Grade", sql.VarChar(10), record.Grade)
      .input("Conveyor", sql.VarChar(10), record.Conveyor)
      .input("PackingTime", sql.DateTime, record.PackingTime)
      .input("ModuleCode", sql.VarChar(50), record.ModuleCode)
      .input("ResultCode", sql.TinyInt, record.ResultCode)
      .input("Remark", sql.VarChar(250), record.Remark)
      .query(insertQuery);

    insertedCount++;
    console.log(`Inserted record ${insertedCount}/${records.length} into cell_sorting_backup.`);
  }

  console.log(`Successfully inserted ${insertedCount} records into cell_sorting_backup.`);
} else {
  console.log(`No records found to insert for ModuleCode: ${scannedBarcode}.`);
}


    // Process for checking module code completeness
    const moduleCode = scannedBarcode.substring(0, 6);
    console.log("Extracted ModuleCode:", moduleCode);
    const moduleCountQuery = `SELECT COUNT(*) AS count FROM voltage_ir_admin WHERE ModuleCode = '${moduleCode}'`;
    const moduleCountResult = await queryMainDatabase(moduleCountQuery);
    const moduleCount = moduleCountResult.recordset[0].count;
    
    console.log("moduleCountQuery",moduleCountQuery);
    console.log("moduleCountResult",moduleCountResult);
    console.log("moduleCount",moduleCount);
   
    if (moduleCount > 0) {
      const cellSortingCountQuery = `
        SELECT COUNT(*) AS count FROM cell_sorting_backup
        WHERE ModuleCode = '${scannedBarcode}'`;
      const cellSortingCountResult = await queryMainDatabase(cellSortingCountQuery);
      const cellSortingCount = cellSortingCountResult.recordset[0].count;

      console.log("cellSortingCountQuery",cellSortingCountQuery);
      console.log("cellSortingCountResult",cellSortingCountResult);
      console.log("cellSortingCount",cellSortingCount);
      
      if (cellSortingCount === moduleCount) {
        res.status(200).json({
          message: "Module complete in cell sorting.",
          moduleCode,
          count: moduleCount,
        });
      } else {
        res.status(400).json({
          message: "Module not complete in cell sorting.",
          moduleCode,
          expectedCount: moduleCount,
          foundCount: cellSortingCount,
        });
      }
    } else {
      res.status(404).json({
        message: "ModuleCode not found in voltage_ir_admin.",
      });
    }
  } catch (error) {
    console.error("Error querying database:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


// const express = require("express");
// const sql = require("mssql");

// const app = express();
// app.use(express.json());

// // Database Connection
// const dbConfig = {
//  user: "admin2",
//   password: "reset@123",
//   server: "REP-TRACE",
//   database: "replus_treceability",
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//   },
// };

// const mainPool = new sql.ConnectionPool(dbConfig);
// const mainPoolConnect = mainPool.connect();

// // Helper function to query the database
// async function queryDatabase(query) {
//   await mainPoolConnect;
//   const request = new sql.Request(mainPool);
//   return request.query(query);
// }

// // API to check barcode and count entries
// app.post("/checkBarcode", async (req, res) => {
//   const { scannedBarcode } = req.body;
  
//   // Log the received barcode for debugging
//   console.log("scannedBarcode::", scannedBarcode);
  
//   // Check if scannedBarcode is provided and valid
//   if (!scannedBarcode || scannedBarcode.length < 6) {
//     return res.status(400).json({ error: "Invalid barcode provided." });
//   }

//   // Extract the first 6 characters of the scanned barcode
//   const moduleCode = scannedBarcode.substring(0, 6);
//   console.log("Extracted ModuleCode:", moduleCode);

//   try {   
//     // Query to get the count of modules for the extracted module code
//     const moduleCountQuery = `SELECT COUNT(*) AS count FROM voltage_ir_admin WHERE ModuleCode = '${moduleCode}'`;
//    console.log("moduleCountQuery", moduleCountQuery);

//     const moduleCountResult = await queryDatabase(moduleCountQuery);
//     const moduleCount = moduleCountResult.recordset[0].count;

//     if (moduleCount > 0) {
//       // Query to check if the same number of entries exist in cell_sorting_backup
//       // const cellSortingQuery = `SELECT COUNT(*) AS count FROM cell_sorting_backup WHERE ModuleCode LIKE '${moduleCode}%'`;

//       const cellSortingQuery = `SELECT COUNT(*) AS count FROM cell_sorting_backup WHERE ModuleCode = '${scannedBarcode}'`;
//      console.log("cellSortingQuery", cellSortingQuery);
//       const cellSortingResult = await queryDatabase(cellSortingQuery);

//       const cellSortingCount = cellSortingResult.recordset[0].count;
// console.log("cellSortingCount", cellSortingCount);
//       if (cellSortingCount == moduleCount) {
//         res.status(200).json({
//           message: "Module complete in cell sorting.",
//           moduleCode,
//           count: moduleCount,
//         });
//       } else {
//         res.status(400).json({
//           message: "Module not complete in cell sorting.",
//           moduleCode,
//           expectedCount: moduleCount,
//           foundCount: cellSortingCount,
//         });
//       }
//     } else {
//       res.status(404).json({
//         message: "ModuleCode not found in voltage_ir_admin.",
//       });
//     }
//   } catch (error) {
//     console.error("Error querying database:", error.message);
//     res.status(500).json({ error: "Internal Server Error" });
//   }
// });
// // Start the server
// const PORT = 4000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

