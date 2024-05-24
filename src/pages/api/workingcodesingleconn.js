import { log } from 'util';
import { moduleBarcode } from './getbarcode';
import { rfidDetails as initialRfidDetails } from './getrfid'; // Renamed to avoid conflict
import sql from 'mssql';

// Main database configuration
const SqlConfig = {
    user: 'admin',
    password: 'admin',
    server: 'DESKTOP-FKJATC0',
    database: 'replus_treceability',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};
console.log("Connected to ", SqlConfig);

const intervalTime = 5000; // 5 seconds

async function checkRFIDAndUpdateDatabase() {
    let pool;
    try {
        // Get module barcode
        const barcode = moduleBarcode;

        // Get RFID details
        const { RFID } = initialRfidDetails; // Use initialRfidDetails here

        // Connect to the database
        pool = await sql.connect(SqlConfig);

        // Get current date and time
        const currentDateTime = new Date();

        // Check if RFID exists in the table
        const selectSql = `SELECT * FROM replus_treceability.dbo.link_module_RFID WHERE RFID = @RFID`;
        const result = await pool.request()
            .input('RFID', sql.NVarChar, RFID)
            .query(selectSql);

        if (result.recordset.length > 0) {
            // RFID exists, update data
            const updateSql = `UPDATE replus_treceability.dbo.link_module_RFID 
                               SET module_barcode = @barcode, date_time = @datetime 
                               WHERE RFID = @RFID`;
            await pool.request()
                .input('barcode', sql.NVarChar, barcode)
                .input('datetime', sql.DateTime, currentDateTime)
                .input('RFID', sql.NVarChar, RFID)
                .query(updateSql);
            console.log("Data updated successfully.");
        } else {
            // RFID doesn't exist, insert data
            const insertSql = `INSERT INTO replus_treceability.dbo.link_module_RFID (RFID, module_barcode, date_time) 
                               VALUES (@RFID, @barcode, @datetime)`;
            await pool.request()
                .input('RFID', sql.NVarChar, RFID)
                .input('barcode', sql.NVarChar, barcode)
                .input('datetime', sql.DateTime, currentDateTime)
                .query(insertSql);
            console.log("Data inserted successfully.");
        }

        return initialRfidDetails; // Return the initial rfidDetails
    } catch (error) {
        console.error("Error processing RFID and updating database:", error);
    } finally {
        if (pool) {
            // Close the database connection
            pool.close();
        }
    }
}

async function checkTagDataAndUpdate(rfidDetails) {
    let pool;
    try {
        // Get RFID details
        const { RFID, v1statusok, v1statusnotok, v1error } = rfidDetails;

        // Check if either tag is true
        if (v1statusok || v1statusnotok) {
            console.log("Tag status::::", v1statusok ? "OK" : "NOT OK");

            // Connect to the database
            pool = await sql.connect(SqlConfig);

            // Determine which tag is true
            const status = v1statusok ? 'OK' : 'NOT OK';
            const tagError = v1error;
            console.log("status:", status);

            const selectSql = `SELECT * FROM replus_treceability.dbo.link_module_RFID WHERE RFID = @RFID`;
            console.log("selectSql::", RFID);

            const result = await pool.request()
                .input('RFID', sql.NVarChar, RFID)
                .query(selectSql);

            if (result.recordset.length > 0) {
                const moduleBarcode = result.recordset[0].module_barcode;
                const v1_start_date = result.recordset[0].date_time; // Get the date_time as v1_start_date

                // Check if moduleBarcode is present in cell_sorting
                const checkSql = `SELECT module_barcode, battery_pack_name FROM replus_treceability.dbo.cell_sorting WHERE module_barcode = @moduleBarcode`;
                const checkResult = await pool.request()
                    .input('moduleBarcode', sql.NVarChar, moduleBarcode)
                    .query(checkSql);

                if (checkResult.recordset.length > 0) {
                    const { module_barcode, battery_pack_name } = checkResult.recordset[0];
                    console.log(`Module barcode ${module_barcode} found in cell_sorting table with battery pack name ${battery_pack_name}.`);

                    // Insert into clw_station_status table
                    const insertStatusSql = `INSERT INTO replus_treceability.dbo.clw_station_status (module_barcode, battery_pack_name, v1_status, v1_error, v1_start_date)
                                             VALUES (@module_barcode, @battery_pack_name, @status, @error, @v1_start_date)`;
                    await pool.request()
                        .input('module_barcode', sql.NVarChar, module_barcode)
                        .input('battery_pack_name', sql.NVarChar, battery_pack_name)
                        .input('status', sql.NVarChar, status)
                        .input('error', sql.NVarChar, tagError)
                        .input('v1_start_date', sql.DateTime, v1_start_date)
                        .query(insertStatusSql);
                    console.log("Status inserted successfully into clw_station_status table.");
                } else {
                    console.log(`Module barcode ${moduleBarcode} not found in cell_sorting table.`);
                }
            }
        }
    } catch (error) {
        console.error("Error checking tag data and updating database:", error);
    } finally {
        // Ensure connection is closed
        if (pool) {
            pool.close();
        }
    }
}

export default async function handler(req, res) {
    let rfidDetails = initialRfidDetails;

    // Initial check and update for RFID data
    // rfidDetails = await checkRFIDAndUpdateDatabase();

    // Continuously monitor and update tag data
    setInterval(async () => {
        rfidDetails = await checkRFIDAndUpdateDatabase();
        await checkTagDataAndUpdate(rfidDetails);
    }, intervalTime);

    // Respond to the request
    res.status(200).json({ message: 'RFID processing started.' });
}
