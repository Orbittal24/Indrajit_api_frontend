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

// Other database configuration
const SqlConfig2 = {
    user: 'admin',
    password: 'admin',
    server: 'OMKAR',
    database: 'replus_treceability',
    options: {
        encrypt: true,
        enableArithAbort: true,
        connectionTimeout: 30000 // Increase to 30 seconds
    }
};
console.log("Connected to ", SqlConfig2);


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
    console.log("rfidDetails::", rfidDetails);

    let pool, otherPool;
    console.log("letttttt::::::", pool, otherPool);
    try {
        // Get RFID details
        const { RFID, v1statusok, v1statusnotok, v1error } = rfidDetails;

        // Check if either tag is true
        if (v1statusok || v1statusnotok) {
            console.log("Tag status::::", v1statusok ? "OK" : "NOT OK");

            // Connect to the database
            pool = await sql.connect(SqlConfig);
            console.log("pool::::::", pool);
            

            // Determine which tag is true
            const status = v1statusok ? 'OK' : 'NOT OK';
            const tagError = v1error;
            console.log("status:", status);

            const selectSql = `SELECT * FROM replus_treceability.dbo.link_module_RFID WHERE RFID = '${RFID}'`;
            console.log("selectSql::", RFID);

            const result = await pool.request()
                .input('RFID', sql.NVarChar, RFID)
                .query(selectSql);

            if (result.recordset.length > 0) {
                const moduleBarcode = result.recordset[0].module_barcode;

                // Connect to the other database and check if moduleBarcode is present in cell_sorting
                otherPool = await sql.connect(SqlConfig2);
                console.log("otherPool::::::", otherPool);

                console.log("SqlConfig2::", RFID);

                const checkSql = `SELECT module_barcode, battery_pack_name FROM replus_treceability.dbo.cell_sorting WHERE module_barcode = '${moduleBarcode}'`;
                const checkResult = await otherPool.request()
                    .input('moduleBarcode', sql.NVarChar, moduleBarcode)
                    .query(checkSql);

                if (checkResult.recordset.length > 0) {
                    const { module_barcode, battery_pack_name } = checkResult.recordset[0];
                    console.log(`Module barcode ${module_barcode} found in cell_sorting table with battery pack name ${battery_pack_name}.`);

                    // Insert into clw_station_status table in the first database
                    const insertStatusSql = `INSERT INTO replus_treceability.dbo.clw_station_status (module_barcode, battery_pack_name, status, error)
                                             VALUES (@module_barcode, @battery_pack_name, @status, @error)`;
                    await pool.request()
                        .input('module_barcode', sql.NVarChar, module_barcode)
                        .input('battery_pack_name', sql.NVarChar, battery_pack_name)
                        .input('status', sql.NVarChar, status)
                        .input('error', sql.NVarChar, tagError)
                        .query(insertStatusSql);
                    console.log("Status inserted successfully into clw_station_status table.");
                } else {
                    console.log(`Module barcode ${moduleBarcode} not found in cell_sorting table.`);
                }

                otherPool.close();
            }

            pool.close();
        }
    } catch (error) {
        console.error("Error checking tag data and updating database:", error);
    } finally {
        if (pool) {
            pool.close();
        }
        if (otherPool) {
            otherPool.close();
        }
    }
}

// async function checkTagDataAndUpdate(rfidDetails) {
//     console.log("rfidDetails::", rfidDetails);

//     let pool, otherPool;
//     try {
//         // Get RFID details
//         const { RFID, v1statusok, v1statusnotok, v1error } = rfidDetails;

//         // Check if either tag is true
//         if (v1statusok || v1statusnotok) {
//             console.log("Tag status::::", v1statusok ? "OK" : "NOT OK");

//             // Connect to the database
//             pool = await sql.connect(SqlConfig);

//             // Determine which tag is true
//             const status = v1statusok ? 'OK' : 'NOT OK';
//             const tagError = v1error;
//             console.log("status:", status);

//             const selectSql = `SELECT * FROM replus_treceability.dbo.link_module_RFID WHERE RFID = '${RFID}'`;
//             console.log("selectSql::", RFID);

//             const result = await pool.request()
//                 .input('RFID', sql.NVarChar, RFID)
//                 .query(selectSql);

//             if (result.recordset.length > 0) {
//                 const moduleBarcode = result.recordset[0].module_barcode;

//                 // Close the first connection
//                 await pool.close();
//                 console.log("Closed first pool connection.");

//                 // Connect to the other database and check if moduleBarcode is present in cell_sorting
//                 otherPool = await sql.connect(SqlConfig2);
//                 console.log("SqlConfig2::", RFID);

//                 const checkSql = `SELECT module_barcode, battery_pack_name FROM replus_treceability.dbo.cell_sorting WHERE module_barcode = '${moduleBarcode}'`;
//                 const checkResult = await otherPool.request()
//                     .input('moduleBarcode', sql.NVarChar, moduleBarcode)
//                     .query(checkSql);

//                 if (checkResult.recordset.length > 0) {
//                     const { module_barcode, battery_pack_name } = checkResult.recordset[0];
//                     console.log(`Module barcode ${module_barcode} found in cell_sorting table with battery pack name ${battery_pack_name}.`);

//                     // Reconnect to the first database for insertion
//                     pool = await sql.connect(SqlConfig);
//                     console.log("Reconnected to the first database.");

//                     const insertStatusSql = `INSERT INTO replus_treceability.dbo.clw_station_status (module_barcode, battery_pack_name, status, error)
//                                              VALUES (@module_barcode, @battery_pack_name, @status, @error)`;
//                     await pool.request()
//                         .input('module_barcode', sql.NVarChar, module_barcode)
//                         .input('battery_pack_name', sql.NVarChar, battery_pack_name)
//                         .input('status', sql.NVarChar, status)
//                         .input('error', sql.NVarChar, tagError)
//                         .query(insertStatusSql);
//                     console.log("Status inserted successfully into clw_station_status table.");
//                 } else {
//                     console.log(`Module barcode ${moduleBarcode} not found in cell_sorting table.`);
//                 }

//                 // Close the other connection
//                 await otherPool.close();
//                 console.log("Closed other pool connection.");
//             }

//             // Close the first connection if it was reopened
//             if (pool) {
//                 await pool.close();
//                 console.log("Closed first pool connection after reopening.");
//             }
//         }
//     } catch (error) {
//         console.error("Error checking tag data and updating database:", error);
//     } finally {
//         // Ensure all connections are closed
//         if (pool) {
//             await pool.close();
//         }
//         if (otherPool) {
//             await otherPool.close();
//         }
//     }
// }


export default async function handler(req, res) {
    let rfidDetails = initialRfidDetails; 

    // Initial check and update for RFID data
    rfidDetails = await checkRFIDAndUpdateDatabase();

    // Continuously monitor and update tag data
    setInterval(async () => {
        rfidDetails = await checkRFIDAndUpdateDatabase();
        await checkTagDataAndUpdate(rfidDetails);
    }, intervalTime);

    // Respond to the request
    res.status(200).json({ message: 'RFID processing started.' });
}






// import { moduleBarcode } from './getbarcode';
// import { rfidDetails as initialRfidDetails } from './getrfid'; // Renamed to avoid conflict
// import sql from 'mssql';

// const SqlConfig = {
//     user: 'admin',
//     password: 'admin',
//     server: 'DESKTOP-FKJATC0',
//     database: 'replus_treceability',
//     options: {
//         encrypt: false,
//         trustServerCertificate: true,
//     }
// };

// const SqlConfig2 = {
//     user: 'admin',
//     password: 'admin',
//     server: 'OMKAR',
//     database: 'replus_treceability',
//     options: {
//         encrypt: false,
//         trustServerCertificate: true,
//     }
// };

// const intervalTime = 5000; // 5 seconds

// async function checkRFIDAndUpdateDatabase() {
//     let pool;

//     try {
//         // Get module barcode
//         const barcode = moduleBarcode;

//         // Get RFID details
//         const { RFID } = initialRfidDetails; // Use initialRfidDetails here

//         // Connect to the database
//         pool = await sql.connect(SqlConfig);

//         // Get current date and time
//         const currentDateTime = new Date();

//         // Check if RFID exists in the table
//         const selectSql = `SELECT * FROM replus_treceability.dbo.link_module_RFID WHERE RFID = @RFID`;
//         const result = await pool.request()
//             .input('RFID', sql.NVarChar, RFID)
//             .query(selectSql);

//         if (result.recordset.length > 0) {
//             // RFID exists, update data
//             const updateSql = `UPDATE replus_treceability.dbo.link_module_RFID 
//                                SET module_barcode = @barcode, date_time = @datetime 
//                                WHERE RFID = @RFID`;
//             await pool.request()
//                 .input('barcode', sql.NVarChar, barcode)
//                 .input('datetime', sql.DateTime, currentDateTime)
//                 .input('RFID', sql.NVarChar, RFID)
//                 .query(updateSql);
//             console.log("Data updated successfully.");
//         } else {
//             // RFID doesn't exist, insert data
//             const insertSql = `INSERT INTO replus_treceability.dbo.link_module_RFID (RFID, module_barcode, date_time) 
//                                VALUES (@RFID, @barcode, @datetime)`;
//             await pool.request()
//                 .input('RFID', sql.NVarChar, RFID)
//                 .input('barcode', sql.NVarChar, barcode)
//                 .input('datetime', sql.DateTime, currentDateTime)
//                 .query(insertSql);
//             console.log("Data inserted successfully.");
//         }

//         return initialRfidDetails; // Return the initial rfidDetails
//     } catch (error) {
//         console.error("Error processing RFID and updating database:", error);
//     } finally {
//         if (pool) {
//             // Close the database connection
//             pool.close();
//         }
//     }
// }

// async function checkTagDataAndUpdate(rfidDetails) {
//     try {
//         // Get RFID details
//         const { RFID, v1statusok, v1statusnotok, v1error } = rfidDetails;

//         // Check if either tag is true
//         if (v1statusok || v1statusnotok) {
//             // Connect to the database
//             const pool = await sql.connect(SqlConfig);

//             // Determine which tag is true
//             const status = v1statusok ? 'ok' : 'not ok';
//             const tagError = v1error; 

//             // Check which RFID is associated with the change
//             const selectSql = `SELECT * FROM replus_treceability.dbo.link_module_RFID WHERE RFID = @RFID`;
//             const result = await pool.request()
//                 .input('RFID', sql.NVarChar, RFID)
//                 .query(selectSql);

//             if (result.recordset.length > 0) {
//                 const moduleBarcode = result.recordset[0].module_barcode;

//                 // Connect to the other database and check if moduleBarcode is present in cell_sorting
//                 const otherPool = await sql.connect(SqlConfig2);
//                 const checkSql = `SELECT module_barcode, battery_pack_name FROM cell_sorting WHERE module_barcode = @moduleBarcode`;
//                 const checkResult = await otherPool.request()
//                     .input('moduleBarcode', sql.NVarChar, moduleBarcode)
//                     .query(checkSql);

//                 if (checkResult.recordset.length > 0) {
//                     const { module_barcode, battery_pack_name } = checkResult.recordset[0];
//                     console.log(`Module barcode ${module_barcode} found in cell_sorting table with battery pack name ${battery_pack_name}.`);

//                     // Insert into clw_station_status table in the first database
//                     const insertStatusSql = `INSERT INTO replus_treceability.dbo.clw_station_status (module_barcode, battery_pack_name, status, error)
//                                              VALUES (@module_barcode, @battery_pack_name, @status, @error)`;
//                     await pool.request()
//                         .input('module_barcode', sql.NVarChar, module_barcode)
//                         .input('battery_pack_name', sql.NVarChar, battery_pack_name)
//                         .input('status', sql.NVarChar, status)
//                         .input('error', sql.NVarChar, tagError)
//                         .query(insertStatusSql);
//                     console.log("Status inserted successfully into clw_station_status table.");
//                 } else {
//                     console.log(`Module barcode ${moduleBarcode} not found in cell_sorting table.`);
//                 }

//                 otherPool.close();
//             }

//             pool.close();
//         }
//     } catch (error) {
//         console.error("Error checking tag data and updating database:", error);
//     }
// }

// export default async function handler(req, res) {
//     let rfidDetails = initialRfidDetails; // Initialize rfidDetails with initialRfidDetails

//     // Initial check and update for RFID data
//     rfidDetails = await checkRFIDAndUpdateDatabase();

//     // Continuously monitor and update tag data
//     setInterval(async () => {
//         rfidDetails = await checkRFIDAndUpdateDatabase(); // Update rfidDetails
//         checkTagDataAndUpdate(rfidDetails);
//     }, intervalTime);

//     // Respond to the request
//     res.status(200).json({ message: 'RFID processing started.' });
// }
