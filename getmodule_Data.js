const express = require("express");
const sql = require("mssql");

const app = express();
app.use(express.json());

// Database Connection
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

const mainPool = new sql.ConnectionPool(dbConfig);
const mainPoolConnect = mainPool.connect();

// Helper function to query the database
async function queryDatabase(query) {
  await mainPoolConnect;
  const request = new sql.Request(mainPool);
  return request.query(query);
}

// API to check barcode and count entries
app.post("/checkBarcode", async (req, res) => {
  const { scannedBarcode } = req.body;
  console.log("scannedBarcode::", scannedBarcode);
  
  // Check if scannedBarcode is provided and valid
  if (!scannedBarcode || scannedBarcode.length < 6) {
    return res.status(400).json({ error: "Invalid barcode provided." });
  }

  // Extract the first 6 characters of the scanned barcode
  const moduleCode = scannedBarcode.substring(0, 6);
  console.log("Extracted ModuleCode:", moduleCode);

  try {   
    // Query to get the count of modules for the extracted module code
    const moduleCountQuery = `SELECT COUNT(*) AS count FROM voltage_ir_admin WHERE ModuleCode = '${moduleCode}'`;

    const moduleCountResult = await queryDatabase(moduleCountQuery);
    const moduleCount = moduleCountResult.recordset[0].count;

    if (moduleCount > 0) {
      // Query to check if the same number of entries exist in cell_sorting_backup
      const cellSortingQuery = `SELECT COUNT(*) AS count FROM cell_sorting_backup WHERE ModuleCode LIKE '${moduleCode}%'`;

      const cellSortingResult = await queryDatabase(cellSortingQuery);
      const cellSortingCount = cellSortingResult.recordset[0].count;

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
        message: "ModuleCode not found in replus_voltage_ir_admin.",
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
