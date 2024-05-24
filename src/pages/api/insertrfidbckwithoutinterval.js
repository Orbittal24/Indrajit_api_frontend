import { moduleBarcode } from './getbarcode';
import { rfidDetails } from './getrfid';
import sql from 'mssql';

const destSqlConfig = {
    user: 'admin',
    password: 'admin',
    server: 'DESKTOP-FKJATC0',
    database: 'replus_treceability',
    options: {
    encrypt: false,
    trustServerCertificate: true,
    }
};

export default async function handler(req, res) {
    let pool;

    try {
        // Get module barcode
        const barcode = moduleBarcode;

        // Get RFID details
        const { RFID, v1statusok, v1statusnot, errorcode } = rfidDetails;

        // Check if either v1statusok or v1statusnot is 1
        if (v1statusok === 1 || v1statusnot === 1) {
            // Connect to the database  
            pool = await sql.connect(destSqlConfig);

            // Check if RFID exists in the table
            const selectSql = `SELECT * FROM replus_treceability.dbo.link_module_RFID WHERE RFID = @RFID`;
            const result = await pool.request()
                .input('RFID', sql.NVarChar, RFID)
                .query(selectSql);

            if (result.recordset.length > 0) {
                // RFID exists, update data
                const updateSql = `UPDATE replus_treceability.dbo.link_module_RFID SET module_barcode = @barcode WHERE RFID = @RFID`;
                await pool.request()
                    .input('barcode', sql.NVarChar, barcode)
                    .input('RFID', sql.NVarChar, RFID)
                    .query(updateSql);
                console.log("Data updated successfully.");
            } else {
                // RFID doesn't exist, insert data
                const insertSql = `INSERT INTO replus_treceability.dbo.link_module_RFID (RFID, module_barcode) VALUES (@RFID, @barcode)`;
                await pool.request()
                    .input('RFID', sql.NVarChar, RFID)
                    .input('barcode', sql.NVarChar, barcode)
                    .query(insertSql);
                console.log("Data inserted successfully.");
            }
        }

        // Send response
        res.status(200).json({
            message: "RFID and Module Barcode processed successfully.",
            barcode,
            RFID,
            v1statusok,
            v1statusnot,
            errorcode
        });
    } catch (error) {
        console.error("Error processing request:", error);
        res.status(500).json({ error: 'An error occurred', details: error.message });
    } finally {
        if (pool) {
            // Close the database connection
            pool.close();
        }
    }
}
