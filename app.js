const net = require('net');
const sql = require('mssql');
const axios = require('axios');

// Database connection config
const dbConfig = {
  user: 'admin',
  password: 'admin',
  server: 'AMRUTA',
  database: 'replus_treceability',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

const mainPool = new sql.ConnectionPool(dbConfig);
const mainPoolConnect = mainPool.connect();

function formatDateTime(dateTime) {
  const dateObj = new Date(dateTime);
  const datePart = dateObj.toISOString().split("T")[0];
  const timePart = dateObj.toISOString().split("T")[1].split(".")[0];
  return `${datePart} ${timePart}`;
}

// Global date
const curdate = new Date();
const yr = curdate.getFullYear();
const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
const day = ("0" + curdate.getDate()).slice(-2);
const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;
console.log("today_date::", today_date);


// Global Variables
var scannedBarcode1 = "";
var scannedBarcode2 = "";
var tags = null;
var previousTags = null;
var lastProcessedRFID = null;

// Create a server to listen on port 7080
const server = net.createServer(async (socket) => {
  console.log('Client connected');

  socket.on('data', async (data) => {
    try {
      const receivedData = data.toString().trim(); // Convert buffer to string and trim whitespace
  
      // Split the concatenated JSON objects based on `}{` as a delimiter between them.
      const jsonStrings = receivedData.split(/(?<=\})\s*(?=\{)/);
  
      for (const jsonString of jsonStrings) {
        let barcode = null;
  
        // Check if the received string is RFID data (starts with `{`)
        if (jsonString.startsWith('{')) {
          // Handle RFID tags
          try {
            const jsonData = JSON.parse(jsonString);
            console.log('Received RFID tags:', jsonData);
  
            // Save tags globally
            tags = jsonData;
  
            // Process RFID tags after receiving them
            if (scannedBarcode1 && scannedBarcode2) {
              await processRFIDTags(tags, socket); // Process RFID for multiple barcodes
            } else if (scannedBarcode1 && !scannedBarcode2) {
              await processRFIDTagsSingle(tags, socket); // Process RFID for single barcode
            }
  
            // Process specific RFID tags for Vision, Welding, and FPCB
            if (tags.vision2 && tags.vision2.RFID) {
              await processVision2(tags, socket); // Process RFID for Vision 2
            } else {
              console.log('No Vision 2 tags received.');
            }
  
            if (tags.welding && tags.welding.RFID) {
              await processWelding(tags, socket); // Process RFID for Welding
            } else {
              console.log('No Welding tags received.');
            }
  
            if (tags.fpcb && tags.fpcb.RFID) {
              await processFpcb(tags, socket); // Process RFID for Fpcb
            } else {
              console.log('No Fpcb tags received.');
            }
  
          } catch (e) {
            console.error('Error parsing RFID tags:', e.message);
          }
        } else {
          // Handle barcode input
          barcode = jsonString;
          console.log('Received barcode:', barcode);
  
          handleBarcodeScan(barcode);
  
          // Call the API for each new barcode received
          try {
            const apiUrl = 'http://127.0.0.1:4000/checkBarcode';
  
            const response = await axios.post(apiUrl, {
              scannedBarcode: barcode,
            });
  
            const message = response.data.message;
            console.log(`API Response: ${message}`);
  
            // Send the API response to the frontend
            socket.write(JSON.stringify({ message }));
  
            // If the module is complete, proceed with further processing
            if (message === 'Module complete in cell sorting.') {
              const module_code = barcode.split('_')[0]; // e.g., 16S01P
  
              const request = new sql.Request(mainPool);
              const result = await request.input('module_code', sql.VarChar, module_code).query(`SELECT no_of_modules FROM vision_pack_master WHERE module_code = @module_code`);
  
              // Convert moduleCount to an integer
              const moduleCount = parseInt(result.recordset[0].no_of_modules, 10);
  
              if (moduleCount === 1) {
                // Process single module
                await singlemodule(barcode, socket);
  
                // Process RFID tags if already received
                if (tags && tags.vision1) {
                  await processRFIDTagsSingle(tags, socket);
                } else {
                  console.log('Waiting for RFID tags...');
                }
              } else if (moduleCount > 1) {
                // Process multiple modules
                await multiplemodule(barcode, socket);
  
                // Process RFID tags if both barcodes are scanned
                if (scannedBarcode1 && scannedBarcode2) {
                  // Process RFID tags for multiple barcodes only when both are scanned
                  await processRFIDTags(tags, socket);
                } else if (scannedBarcode1 && !scannedBarcode2) {
                  console.log('1st barcode scanned, waiting for the 2nd one.');
                }
              } else {
                console.log('Invalid module count');
              }
            } else {
              console.log('Module is not complete. Halting further processing.');
              return;
            }
  
          } catch (error) {
            if (error.response && error.response.status === 404) {
              console.error('API route not found, check the API URL or route.');
            } else {
              console.error('Error calling checkBarcode API:', error.message);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing data:', error.message);
    }
  });
  
});

let scannedBarcodes = [];
// Function to handle the scanning of barcodes
function handleBarcodeScan(barcode) {
  // If we already have 2 barcodes, do not add more
  if (scannedBarcodes.length < 2) {
    scannedBarcodes.push(barcode);
    console.log('Scanned barcode:', barcode);
  } else {
    console.log('More than 2 barcodes scanned, waiting for new RFID...');
  }
}

async function singlemodule(barcode, socket) {
  console.log(`Single module processing for: ${barcode}`);

  // Check if the barcode is already scanned, if not, set it as the scanned barcode
  if (!scannedBarcode1) {
    scannedBarcode1 = barcode;  // Store the scanned barcode
    console.log('Single module barcode scanned successfully:', scannedBarcode1);

    if (socket && socket.write) {
      socket.write(JSON.stringify({ message: 'Module Barcode Scanned Successfully!' }));
    } else {
      console.error('Socket is undefined or invalid');
    }

    // Now proceed to process RFID tags if they are already received
    await checkAndProcessRFIDTags(socket);
  } else if (barcode === scannedBarcode1) {
    console.log('This module barcode has already been scanned.');
  }
}

// Helper function to check for RFID tags and process them when available
async function checkAndProcessRFIDTags(socket) {
  // Continuously check for RFID tags (with some delay to avoid blocking)
  const checkInterval = 1000;  // 1 second interval between checks
  const maxRetries = 10;       // Maximum attempts before timing out

  for (let i = 0; i < maxRetries; i++) {
    if (tags && tags.vision1) {
      console.log('RFID tags received, processing now...');
      await processRFIDTagsSingle(tags, socket);
      return;  // Exit the loop once processing is done
    } else {
      console.log('Waiting for RFID tags...');
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
  }

  console.error('Timeout waiting for RFID tags.');
}

async function multiplemodule(barcode, socket) {
  console.log(`Multiple module processing for: ${barcode}`);

  if (!scannedBarcode1) {
    scannedBarcode1 = barcode;
    console.log('1st module barcode scanned successfully:', scannedBarcode1);
  } else if (!scannedBarcode2 && barcode !== scannedBarcode1) {
    scannedBarcode2 = barcode;
    console.log('2nd module barcode scanned successfully:', scannedBarcode2);

    // Send a message to the frontend indicating both module barcodes have been successfully scanned
    socket.write(JSON.stringify({ message: 'Both module barcodes scanned successfully.' }));

    // Now we wait for tags to proceed
    if (tags) {
      await processRFIDTags(tags, socket); // If tags are already received, process them
    } else {
      console.log('Waiting for RFID tags...');
    }
  } else if (barcode === scannedBarcode1) {
    console.log('1st module barcode already scanned. Waiting for the 2nd module.');
  }
}

// Function to process RFID tags and link them to a single barcode
async function processRFIDTagsSingle(tags, socket) {
  if (!tags.vision1 || !tags.vision1.RFID) {
    console.error("No valid vision1 RFID received or vision1 is null/undefined.");
    return;  // Exit if there's no valid vision1
  }
  const RFID = tags.vision1.RFID;
  console.log("Processing RFID for single module:", RFID);

  try {
    const request = new sql.Request(mainPool);

    // Check if RFID exists in the database
    const selectQuery = `SELECT RFID, module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`;
    const result = await request.query(selectQuery);

    // Use scannedBarcode1 for single-module processing
    let singleBarcode = scannedBarcode1;

    if (!singleBarcode) {
      console.error('Scanned barcode is undefined. Unable to link RFID.');
      return;
    }

    // Insert/update in linking_module_RFID table when status is false
    if (!tags.vision1.OKStatus && !tags.vision1.NOKStatus) {
      // RFID exists, update with the single barcode if necessary
      if (result.recordset.length > 0) {
        const updateQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET module_barcode = '${singleBarcode}', v1_live_status = 1 WHERE RFID = '${RFID}'`;
        await request.query(updateQuery);
        console.log(`Updated entry for RFID: ${RFID}`);
      } else {
        // New RFID, insert new record
        const insertQuery = `INSERT INTO [replus_treceability].[dbo].[linking_module_RFID] (RFID, module_barcode, v1_live_status, date_time) VALUES ('${RFID}', '${singleBarcode}', 1, '${today_date}')`;
        await request.query(insertQuery);
        console.log(`Inserted new record for RFID: ${RFID}`);
      }

    //   if (tags.vision1.CycleStartConfirm === false) {
    //     tags.vision1.CycleStartConfirm = true;
    //     console.log(`CycleStartConfirm was false. Now set to true for RFID: ${RFID}`);
    // }

      // Call the function here to notify Hercules
      await writeCycleStartConfirmToHercules(RFID, socket);


      // Send success message to frontend for linking
      socket.write(JSON.stringify({ message: 'Single barcode and RFID linked successfully!' }));
    }

    // If OKStatus or NOKStatus is true, insert/update in clw_station_status table
    if (tags.vision1.OKStatus || tags.vision1.NOKStatus) {
      console.log('Status is true, proceeding to update clw_station_status for single module.');
      await processVision1Single(singleBarcode, tags, socket);
      resetVariables();
    }

  } catch (error) {
    console.error('Error handling RFID tags for single module:', error.message);
  }
}

// Function to process RFID tags and link them to multiple barcodes
// async function processRFIDTags(tags, socket) {
//   const RFID = tags.vision1.RFID;
//   console.log("Processing RFID for multiple modules:", RFID);

//   try {
//       const request = new sql.Request(mainPool);

//       // Combine both barcodes
//       let combinedBarcodes = `${scannedBarcode1},${scannedBarcode2}`;

//       // Check if RFID exists in the database and update with both barcodes
//       const selectQuery = `SELECT RFID, module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`;
//       const result = await request.query(selectQuery);

//       if (result.recordset.length > 0) {
//           const updateQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] 
//                                SET module_barcode = '${combinedBarcodes}', v1_live_status = 1, date_time = '${today_date}' 
//                                WHERE RFID = '${RFID}'`;
//           await request.query(updateQuery);
//           console.log(`Updated RFID: ${RFID} with barcodes: ${combinedBarcodes}`);
//       } else {
//           const insertQuery = `INSERT INTO [replus_treceability].[dbo].[linking_module_RFID] 
//                                (RFID, module_barcode, v1_live_status, date_time) 
//                                VALUES ('${RFID}', '${combinedBarcodes}', 1, '${today_date}')`;
//           await request.query(insertQuery);
//           console.log(`Inserted new record for RFID: ${RFID} with barcodes: ${combinedBarcodes}`);
//       }
      
//       // Set CycleStartConfirm to true after successful insert/update
//       tags.vision1.CycleStartConfirm = true;
//       console.log("CycleStartConfirm tag set to true!");

//       // Send success message to frontend
//       socket.write(JSON.stringify({ message: 'Multiple barcodes and RFID linked successfully!' }));

//   } catch (error) {
//       console.error('Error processing RFID tags for multiple modules:', error.message);
//       socket.write(JSON.stringify({ message: 'Error processing RFID tags for multiple modules.' }));
//   }


//   // If OKStatus or NOKStatus is true, insert/update in clw_station_status table
//   if (tags.vision1.OKStatus || tags.vision1.NOKStatus) {
//     console.log('Status is true, proceeding to update clw_station_status for multiple module.');
//     await processVision1(scannedBarcode1, scannedBarcode2, tags, socket);
//     resetVariables();
//   }

// }

async function processRFIDTags(tags, socket) {
  if (!tags.vision1 || !tags.vision1.RFID) {
      console.error("No valid vision1 RFID received or vision1 is null/undefined.");
      return;  // Exit if there's no valid vision1
  }
  const RFID = tags.vision1.RFID;
  console.log("Processing RFID for multiple modules:", RFID);

  try {
      const request = new sql.Request(mainPool);

      // Combine both barcodes
      let combinedBarcodes = `${scannedBarcode1},${scannedBarcode2}`;

      // Check if RFID exists in the database and update with both barcodes
      const selectQuery = `SELECT RFID, module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`;
      const result = await request.query(selectQuery);

      if (result.recordset.length > 0) {
          const updateQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET module_barcode = '${combinedBarcodes}', v1_live_status = 1, date_time = '${today_date}' WHERE RFID = '${RFID}'`;
          await request.query(updateQuery);
          console.log(`Updated RFID: ${RFID} with barcodes: ${combinedBarcodes}`);
      } else {
          const insertQuery = `INSERT INTO [replus_treceability].[dbo].[linking_module_RFID] (RFID, module_barcode, v1_live_status, date_time) VALUES ('${RFID}', '${combinedBarcodes}', 1, '${today_date}')`;
          await request.query(insertQuery);
          console.log(`Inserted new record for RFID: ${RFID} with barcodes: ${combinedBarcodes}`);
      }

      // Set CycleStartConfirm to true after successful insert/update
      if (tags.vision1) {
          tags.vision1.CycleStartConfirm = true;
          console.log("CycleStartConfirm tag set to true!");
      }

      // Send success message to frontend
      socket.write(JSON.stringify({ message: 'Multiple barcodes and RFID linked successfully!' }));

      // Reset tags only after everything is processed
      tags = null;
      console.log("RFID tags have been reset.");

  } catch (error) {
      console.error('Error processing RFID tags for multiple modules:', error.message);
  }

  if (tags.vision1.OKStatus || tags.vision1.NOKStatus) {
      console.log('Status is true, proceeding to update clw_station_status for multiple module.');
      try {
          await processVision1(scannedBarcode1, scannedBarcode2, tags, socket);
      } catch (err) {
          console.error('Error during Vision1 processing:', err);
      } finally {
          resetVariables(); // Ensure the barcodes are always reset
      }
  }
}

// Function to send write request to Hercules to update CycleStartConfirm
async function writeCycleStartConfirmToHercules(RFID, socket) {
  try {
      // Prepare payload to send to Hercules
      const payload = JSON.stringify({
          tag: 'CycleStartConfirm',
          value: true,
          RFID: RFID  // Pass RFID for reference
      });

      // Send payload to Hercules through the TCP socket
      socket.write(payload);  // Directly write the message to the socket

      console.log(`Sent CycleStartConfirm set to true for RFID: ${RFID} to Hercules via socket.`);
  } catch (error) {
      console.error('Error communicating with Hercules:', error.message);
  }
}

// Function to process Vision 1 for single module 
async function processVision1Single(singleBarcode, tags, socket) {
  console.log(`Processing Vision1 for single barcode: ${singleBarcode}`);

  try {
    const request = new sql.Request(mainPool);

    const RFID = tags.vision1.RFID;
    const statusToStore = tags.vision1.OKStatus ? "OK" : tags.vision1.NOKStatus ? "NOT OK" : null;
    const v1error = tags.vision1.ERRORStatus;

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      const globalFormattedDateTime = formatDateTime(dbDate);

      // Query to check if the module already exists in clw_station_status
      const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${singleBarcode}'`;
      const statusResult = await request.query(selectQuery);

      if (statusResult.recordset.length > 0) {
        // Update the existing record
        const updateQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = '${statusToStore}', v1_error = '${v1error}', RFID = '${RFID}', v1_start_date = '${today_date}', v1_end_date = '${today_date}' WHERE module_barcode = '${singleBarcode}'`;
        await request.query(updateQuery);
        console.log(`Updated Vision1 status for single module: ${singleBarcode}`);
      } else {
        // Insert a new record if the barcode doesn't exist
        const insertQuery = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${singleBarcode}', '${statusToStore}', '${v1error}', '${RFID}', '${today_date}', '${today_date}')`;
        await request.query(insertQuery);
        console.log(`Inserted new Vision1 status for single module: ${singleBarcode}`);
      }
        // update the `v1_live_status` in `linking_module_RFID`
        const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${singleBarcode}'`;
        console.log("updateLinkingQuery::", updateLinkingQuery)
        await request.query(updateLinkingQuery);
        
        console.log(`Updated v1_live_status`);
      
      // Notify the frontend
      socket.write(JSON.stringify({ message: "Vision 1 Cycle Completed!" }));

    } else {
      console.error(`No record found for RFID: ${RFID}`);
    }

     /******************** indrajeet code start **************************/
     const combinedResult1 = await mainPool.request().query(`
      WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${singleBarcode}' ORDER BY sr_no DESC)
      SELECT TOP 1 v1_end_date FROM [dbo].[clw_station_status] WHERE  sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, v1_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

      let previous_v1_end_date = null;
      if (combinedResult1.recordset.length > 0) {
        previous_v1_end_date = combinedResult1.recordset[0].v1_end_date;
      }
      console.log("vision 1 datee ::", previous_v1_end_date);

      if (previous_v1_end_date != null) {
        globalFormattedDateTime1 = formatDateTime(previous_v1_end_date);

        console.log("globalFormattedDateTime1::", globalFormattedDateTime1);

        if (globalFormattedDateTime1) {
          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v1_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${singleBarcode}'`);
        } else {
          console.log(`No previous record found for module_barcode: ${singleBarcode}`);
        }
        
      /******************** To send NOT OK Status in rework table ****************************/
      if (statusToStore === 'NOT OK') {
        await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station) VALUES ('${singleBarcode}', 'Vision 1')`);
        console.log("Data inserted into replus_NOTOK_history_details for Vision 1");
      }

      } else {
        console.log(`No previous record found for module_barcode: ${singleBarcode}`);
      }
    /******************** indrajeet code end **************************/

  } catch (error) {
    console.error('Error processing Vision1 for single module:', error.message);
  }
}

// // Function to process Vision 1 for multiple modules
// async function processVision1(scannedBarcode1, scannedBarcode2, tags, socket) {
//   console.log(`Processing Vision1 for barcodes: ${scannedBarcode1}, ${scannedBarcode2}`);

//   try {
//     const request = new sql.Request(mainPool);

//     if (!tags || !tags.vision1) {
//       throw new Error("Vision 1 data is undefined");
//     }

//     const RFID = tags.vision1.RFID;
//     const statusToStore = tags.vision1.OKStatus ? "OK" : tags.vision1.NOKStatus ? "NOT OK" : null;
//     const v1error = tags.vision1.ERRORStatus;

//     // Get the date_time for the given RFID
//     const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
//     if (dateResult.recordset.length > 0) {
//       const dbDate = dateResult.recordset[0].date_time;
//       const globalFormattedDateTime = formatDateTime(dbDate);

//       for (const barcode of [scannedBarcode1, scannedBarcode2]) {
//         // Check if the module already exists in `clw_station_status`
//         const statusCheckQuery = `SELECT module_barcode FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${barcode}'`;
//         const statusResult = await request.query(statusCheckQuery);

//         if (statusResult.recordset.length > 0) {
//           // Update the existing record
//           const updateQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = '${statusToStore}', v1_error = '${v1error}', RFID = '${RFID}', v1_start_date = '${globalFormattedDateTime}', v1_end_date = '${today_date}' WHERE module_barcode = '${barcode}'`;
//           await request.query(updateQuery);
//           console.log(`Updated clw_station_status for barcode: ${barcode}`);
//         } else {
//           // Insert a new record if it doesn't exist
//           const insertQuery = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${barcode}', '${statusToStore}', '${v1error}', '${RFID}', '${globalFormattedDateTime}', '${today_date}')`;
//           await request.query(insertQuery);
//           console.log(`Inserted new clw_station_status record for barcode: ${barcode}`);
//         }
//         // update the `v1_live_status` in `linking_module_RFID`
//         const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${barcode}'`;
//         await request.query(updateLinkingQuery);
//         console.log(`Updated v1_live_status for barcode: ${barcode}`);               
//       }

//       // Notify frontend 
//       socket.write(JSON.stringify({ message: "Vision 1 Cycle Completed!" }));
//       console.log("Vision 1 Cycle Completed!");

//     } else {
//       console.error(`No record found for RFID: ${RFID}`);
//     }

//   } catch (error) {
//     console.error("Error processing Vision1 data:", error.message);
//   }
// }

async function processVision1(scannedBarcode1, scannedBarcode2, tags, socket) {
  console.log(`Processing Vision1 for barcodes: ${scannedBarcode1}, ${scannedBarcode2}`);

  try {
    const request = new sql.Request(mainPool);

    if (!tags || !tags.vision1) {
      throw new Error("Vision 1 data is undefined");
    }

    const RFID = tags.vision1.RFID;
    const statusToStore = tags.vision1.OKStatus ? "OK" : tags.vision1.NOKStatus ? "NOT OK" : null;
    const v1error = tags.vision1.ERRORStatus;

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      const globalFormattedDateTime = formatDateTime(dbDate);

      for (const barcode of [scannedBarcode1, scannedBarcode2]) {
        // Check if the module already exists in `clw_station_status`
        const statusCheckQuery = `SELECT module_barcode FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${barcode}'`;
        const statusResult = await request.query(statusCheckQuery);

        if (statusResult.recordset.length > 0) {
          // Update the existing record
          const updateQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = '${statusToStore}', v1_error = '${v1error}', RFID = '${RFID}', v1_start_date = '${globalFormattedDateTime}', v1_end_date = '${today_date}' WHERE module_barcode = '${barcode}'`;
          await request.query(updateQuery);
          console.log(`Updated clw_station_status for barcode: ${barcode}`);
        } else {
          // Insert a new record if it doesn't exist
          const insertQuery = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${barcode}', '${statusToStore}', '${v1error}', '${RFID}', '${globalFormattedDateTime}', '${today_date}')`;
          await request.query(insertQuery);
          console.log(`Inserted new clw_station_status record for barcode: ${barcode}`);
        
        // update the `v1_live_status` in `linking_module_RFID`
        const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${barcode}'`;       
        await request.query(updateLinkingQuery);
        console.log(`Updated v1_live_status for barcode: ${barcode}`);    
      }  

      /******************** indrajeet code start **************************/
      const combinedResult1 = await mainPool.request().query(`
        WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${barcode}' ORDER BY sr_no DESC)
        SELECT TOP 1 v1_end_date FROM [dbo].[clw_station_status] WHERE  sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, v1_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

        let previous_v1_end_date = null;
        if (combinedResult1.recordset.length > 0) {
          previous_v1_end_date = combinedResult1.recordset[0].v1_end_date;
        }
        console.log("vision 1 datee ::", previous_v1_end_date);

        if (previous_v1_end_date != null) {
          globalFormattedDateTime1 = formatDateTime(previous_v1_end_date);

          console.log("globalFormattedDateTime1::", globalFormattedDateTime1);

          if (globalFormattedDateTime1) {
            await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v1_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${barcode}'`);
          } else {
            console.log(`No previous record found for module_barcode: ${barcode}`);
          }
          
        /******************** To send NOT OK Status in rework table ****************************/
        if (statusToStore === 'NOT OK') {
          await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station) VALUES ('${barcode}', 'Vision 1')`);
          console.log("Data inserted into replus_NOTOK_history_details for Vision 1");
        }

        } else {
          console.log(`No previous record found for module_barcode: ${barcode}`);
        }
      /******************** indrajeet code end **************************/     
      }

      // Notify frontend 
      socket.write(JSON.stringify({ message: "Vision 1 Cycle Completed!" }));
      console.log("Vision 1 Cycle Completed!");


      tags = null;  // Reset tags after processing to clear the previous RFID data
      console.log("RFID tags have been reset.");

    } else {
      console.error(`No record found for RFID: ${RFID}`);
    }

  } catch (error) {
    console.error("Error processing Vision1 data:", error.message);
  }
}

function resetVariables() {
  console.log("resetVariables function is called");
  scannedBarcode1 = "";
  scannedBarcode2 = "";
  scannedBarcodes = [];  // <-- Clear the barcode array
  console.log("Global variables have been reset.");
}

// Function to process Vision 2  
async function processVision2(tags, socket) {
  const RFID = tags.vision2.RFID;
  console.log("Processing RFID for Vision 2:", RFID);

  try {
    const request = new sql.Request(mainPool);

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      // console.log("dbDate:::", dbDate);

      const globalFormattedDateTime = formatDateTime(dbDate);
      console.log("Global Formatted DateTime ::", globalFormattedDateTime);

    // Check if RFID exists in the database from Vision 1
    const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE RFID = '${RFID}'`;
    const result = await request.query(selectQuery);

    if (result.recordset.length > 0) {
      // Both OKStatus and NOKStatus are false, update v2_live_status
      if (!tags.vision2.OKStatus && !tags.vision2.NOKStatus) {
        const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v2_live_status = 1 WHERE RFID = '${RFID}'`;
        await request.query(updateLinkingQuery);
        console.log(`Updated v2_live_status for RFID: ${RFID}`);
      }

      // Either OKStatus or NOKStatus is true, update Vision 2 status
      if (tags.vision2.OKStatus || tags.vision2.NOKStatus) {
        const statusToStore = tags.vision2.OKStatus ? "OK" : "NOT OK";
        const v2Error = tags.vision2.ERRORStatus;
        

        const updateClwStationQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = '${statusToStore}', v2_error = '${v2Error}', v2_start_date = '${globalFormattedDateTime}', v2_end_date = '${today_date}' WHERE RFID = '${RFID}'`;

        await request.query(updateClwStationQuery);
        console.log(`Updated Vision 2 status for RFID: ${RFID}`);
      
     
      // update the `v1_live_status` in `linking_module_RFID`
      const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v2_live_status = '0'`;
      await request.query(updateLinkingQuery);
      console.log(`Updated v2_live_status`)
    }
      
        // Notify frontend
        socket.write(JSON.stringify({ message: 'Vision 2 Cycle Completed!' }));
        console.log("Vision 2 Cycle Completed!");

    } else {
      console.error(`No record found for RFID: ${RFID}`);
    }
    } else {
      console.log(`No matching RFID found for Vision 2: ${RFID}`);
    }
  } catch (error) {
    console.error('Error processing Vision 2 RFID:', error.message);
  }
}

// Function to process Welding 
async function processWelding(tags, socket) {
  const RFID = tags.welding.RFID;
  console.log("Processing Welding for RFID:", RFID);

  try {
    const request = new sql.Request(mainPool);

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      const globalFormattedDateTime = formatDateTime(dbDate);
      console.log("Global Formatted DateTime for Welding::", globalFormattedDateTime);

      // Check if RFID exists in the database
      const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE RFID = '${RFID}'`;
      const result = await request.query(selectQuery);

      if (result.recordset.length > 0) {
        // Update welding_live_status if both OKStatus and NOKStatus are false
        if (!tags.welding.OKStatus && !tags.welding.NOKStatus) {
          const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID]
                                      SET welding_live_status = 1
                                      WHERE RFID = '${RFID}'`;
          await request.query(updateLinkingQuery);
          console.log(`Updated welding_live_status for RFID: ${RFID}`);
        }

        // Update Welding status when either OKStatus or NOKStatus is true
        if (tags.welding.OKStatus || tags.welding.NOKStatus) {
          const statusToStore = tags.welding.OKStatus ? "OK" : "NOT OK";
          const weldingError = tags.welding.ERRORStatus;

          const updateClwStationQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = '${statusToStore}', welding_error = '${weldingError}', welding_start_date = '${globalFormattedDateTime}', welding_end_date = '${today_date}' WHERE RFID = '${RFID}'`;

          await request.query(updateClwStationQuery);
          console.log(`Updated Welding status for RFID: ${RFID}`);

       
        // update the `v1_live_status` in `linking_module_RFID`
        const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET welding_live_status = '0'`;
        await request.query(updateLinkingQuery);
        console.log(`Updated welding_live_status`)
      }
          // Notify frontend
          socket.write(JSON.stringify({ message: `Welding Cycle Completed! Welding Status: ${statusToStore}` }));
          console.log("Welding Cycle Completed!");

      } else {
        console.error(`No record found for RFID: ${RFID}`);
      }
    } else {
      console.log(`No matching RFID found for Welding: ${RFID}`);
    }
  } catch (error) {
    console.error('Error processing Welding RFID:', error.message);
  }
}

// Function to process FPCB
async function processFpcb(tags, socket) {
  const RFID = tags.fpcb.RFID;
  console.log("Processing FPCB for RFID:", RFID);

  try {
    const request = new sql.Request(mainPool);

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      const globalFormattedDateTime = formatDateTime(dbDate);
      console.log("Global Formatted DateTime for FPCB::", globalFormattedDateTime);

      // Check if RFID exists in the database
      const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE RFID = '${RFID}'`;
      const result = await request.query(selectQuery);

      if (result.recordset.length > 0) {
        // Update fpcb_live_status if both OKStatus and NOKStatus are false
        if (!tags.fpcb.OKStatus && !tags.fpcb.NOKStatus) {
          const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = 1 WHERE RFID = '${RFID}'`;
          await request.query(updateLinkingQuery);
          console.log(`Updated fpcb_live_status for RFID: ${RFID}`);
        }

        // Update FPCB status when either OKStatus or NOKStatus is true
        if (tags.fpcb.OKStatus || tags.fpcb.NOKStatus) {
          const statusToStore = tags.fpcb.OKStatus ? "OK" : "NOT OK";
          const fpcbError = tags.fpcb.ERRORStatus;

          const updateClwStationQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = '${statusToStore}', fpcb_error = '${fpcbError}', fpcb_start_date = '${globalFormattedDateTime}', fpcb_end_date = '${today_date}' WHERE RFID = '${RFID}'`;

          await request.query(updateClwStationQuery);
          console.log(`Updated FPCB status for RFID: ${RFID}`);
        
        
        // update the `v1_live_status` in `linking_module_RFID`
        const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = '0'`;
        await request.query(updateLinkingQuery);
        console.log(`Updated fpcb_live_status for barcode: ${barcode}`)
      }
        // Notify frontend
        socket.write(JSON.stringify({ message: `FPCB Cycle Completed! FPCB Status: ${statusToStore}` }));
        console.log("FPCB Cycle Completed!");

      } else {
        console.error(`No record found for RFID: ${RFID}`);
      }
    } else {
      console.log(`No matching RFID found for FPCB: ${RFID}`);
    }
  } catch (error) {
    console.error('Error processing FPCB RFID:', error.message);
  }
}

server.listen(7080, () => {
  console.log('Server listening on port 7080');
});