const net = require('net');
const sql = require('mssql');
const axios = require('axios');
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 6090 });

// Broadcast to all WebSocket clients
function broadcast(message) {
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

// Database connection config
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

function formatDateTime(dateTime) {
  const dateObj = new Date(dateTime);
  const datePart = dateObj.toISOString().split("T")[0];
  const timePart = dateObj.toISOString().split("T")[1].split(".")[0];
  return `${datePart} ${timePart}`;
}

// Global date
// const curdate = new Date();
// const yr = curdate.getFullYear();
// const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
// const day = ("0" + curdate.getDate()).slice(-2);
// const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;
// console.log("today_date::", today_date);


// Global Variables
var scannedBarcode1 = "";
var scannedBarcode2 = "";
var tags = null;
var previousTags = null;
var lastProcessedRFID = null;
let processedRFIDs = [];

// Create a server to listen on port 7080
const server = net.createServer(async (socket) => {
  console.log('Client connected....');


  //******* with do not accept RFID as DA *******//
  // socket.on('data', async (data) => {
  //    try {
  //      const receivedData = data.toString().trim(); // Convert buffer to string and trim whitespace

  //      // Split the concatenated JSON objects based on `}{` as a delimiter between them.
  //      const jsonStrings = receivedData.split(/(?<=\})\s*(?=\{)/);

  //      for (const jsonString of jsonStrings) {
  //        let barcode = null;

  //        // Check if the received string is RFID data (starts with `{`)
  //        if (jsonString.startsWith('{')) {
  //          // Handle RFID tags
  //          try {
  //            const jsonData = JSON.parse(jsonString);
  //            console.log('Received RFID tags:', jsonData);

  //            // Check if RFID tag in vision1 is 'DA' and skip processing for this tag
  //            if (jsonData.vision1 && jsonData.vision1.RFID === 'DA') {
  //              console.log('RFID "DA" is not accepted. Skipping processing for Vision 1.');
  //              continue; // Skip processing for RFID 'DA'
  //            }

  //            // Save tags globally
  //            tags = jsonData;

  //            // Process RFID tags after receiving them
  //            if (scannedBarcode1 && scannedBarcode2) {
  //              await processRFIDTags(tags, socket); // Process RFID for multiple barcodes
  //            } else if (scannedBarcode1 && !scannedBarcode2) {
  //              await processRFIDTagsSingle(tags, socket); // Process RFID for single barcode
  //            }

  //            // Processing for Vision 2 (skip if RFID is 'DA')
  //            if (tags.vision2 && tags.vision2.RFID !== 'DA' && tags.vision2.RFID !== '') {
  //              await processVision2(tags, socket); // Process RFID for Vision 2
  //            } else {
  //              console.log('No Vision 2 tags received or RFID is "DA"');
  //            }

  //            // Processing for Welding (skip if RFID is 'DA')
  //            if (tags.welding && tags.welding.RFID !== 'DA') {
  //              await processWelding(tags, socket); // Process RFID for Welding
  //            } else {
  //              console.log('No Welding tags received or RFID is "DA"');
  //            }

  //            // Processing for FPCB (skip if RFID is 'DA')
  //            if (tags.fpcb && tags.fpcb.RFID !== 'DA') {
  //              await processFpcb(tags, socket); // Process RFID for FPCB
  //            } else {
  //              console.log('No FPCB tags received or RFID is "DA"');
  //            }

  //          } catch (e) {
  //            console.error('Error parsing RFID tags:', e.message);
  //          }
  //        } else {
  //          // Handle barcode input
  //          barcode = jsonString;
  //          console.log('Received barcode:', barcode);

  //          handleBarcodeScan(barcode);

  //          // Call the API for each new barcode received
  //          try {
  //            const apiUrl = 'http://127.0.0.1:4000/checkBarcode';

  //            const response = await axios.post(apiUrl, {
  //              scannedBarcode: barcode,
  //            });

  //            const message = response.data.message;
  //            console.log(`API Response: ${message}`);

  //            // Send the API response to the frontend
  //            broadcast({ message: 'Barcode Scanned', barcode });

  //            // If the module is complete, proceed with further processing
  //            if (message === 'Module complete in cell sorting.') {
  //              broadcast({ message: 'Module complete in cell sorting!', barcode });

  //              const module_code = barcode.split('_')[0];
  //              const request = new sql.Request(mainPool);
  //              const result = await request.input('module_code', sql.VarChar, module_code).query(`SELECT no_of_modules FROM vision_pack_master WHERE module_code = '${module_code}'`);

  //              // Convert moduleCount to an integer
  //              const moduleCount = parseInt(result.recordset[0].no_of_modules, 10);

  //              if (moduleCount === 1) {
  //                // Process single module
  //                await singlemodule(barcode, socket);

  //                // Process RFID tags if already received and RFID is not 'DA'
  //                if (tags && tags.vision1 && tags.vision1.RFID !== 'DA') {
  //                  await processRFIDTagsSingle(tags, socket);
  //                  // Now processing is complete, send CycleStartConfirm
  //                  // await writeCycleStartConfirm(tags.vision1.RFID, socket);
  //                } else {
  //                  console.log('Waiting for valid RFID tags...');
  //                }
  //              } else if (moduleCount > 1) {
  //                // Process multiple modules
  //                await multiplemodule(barcode, socket);

  //                // Process RFID tags if both barcodes are scanned and RFID is not 'DA'
  //                if (scannedBarcode1 && scannedBarcode2 && tags.vision1.RFID !== 'DA') {
  //                  await processRFIDTags(tags, socket);
  //                  // Now processing is complete, send CycleStartConfirm
  //                  // await writeCycleStartConfirm(tags.vision1.RFID, socket);
  //                } else if (scannedBarcode1 && !scannedBarcode2) {
  //                  console.log('1st barcode scanned, waiting for the 2nd one.');
  //                }
  //              } else {
  //                console.log('Invalid module count');
  //              }
  //            } else {
  //              console.log('Module is not complete. Halting further processing.');
  //              broadcast({ message: 'Module is not complete in Cell Sorting!', barcode });
  //              return;
  //            }

  //          } catch (error) {
  //            if (error.response && error.response.status === 404) {
  //              console.error('API route not found, check the API URL or route.');
  //            } else {
  //              console.error('Error calling checkBarcode API:', error.message);
  //            }
  //          }
  //        }
  //      }
  //    } catch (error) {
  //      console.error('Error processing data:', error.message);
  //    }
  // });
  socket.on('data', async (data) => {

    console.log("data", data);
    try {
      const receivedData = data.toString().trim();  // Convert buffer to string and trim whitespace
      const jsonStrings = receivedData.split(/(?<=\})\s*(?=\{)/);  // Split concatenated JSON strings

      for (const jsonString of jsonStrings) {
        let barcode = null;

        // Check if the received string is RFID data (starts with '{')
        if (jsonString.startsWith('{')) {
          // Handle RFID tags
          try {
            const jsonData = JSON.parse(jsonString);
            console.log('Received RFID tags:', jsonData);

            // Save the RFID tags globally
            tags = jsonData;

            const rfid = tags.vision1?.RFID;  // Get the RFID from Vision 1

            // Skip processing if the RFID is invalid (either 'DA' or 0)
            // if (rfid === 'DA' || rfid === 0) {
            //   console.log(`RFID "${rfid}" is invalid. Skipping processing.`);
            //   continue;
            // }

            // Initialize or update processed RFID record
            if (!processedRFIDs[rfid]) {
              processedRFIDs[rfid] = { barcode1: null, barcode2: null };
            }

            // Process RFID tags for Vision 1 (only if not already processed)
            if (processedRFIDs[rfid].barcode1 && processedRFIDs[rfid].barcode2) {
              console.log('Both barcodes have already been scanned for this RFID. Skipping further processing.');
              continue;
            }

            console.log('Processing RFID:', rfid);



            // Assign barcode to the RFID based on which barcode is scanned
            if (!scannedBarcode1) {
              // First barcode scanned
              console.log('First barcode scanned:', barcode);
              scannedBarcode1 = barcode;
              processedRFIDs[rfid].barcode1 = barcode;  // Link first barcode with the RFID
            } else if (!scannedBarcode2) {
              // Second barcode scanned
              console.log('Second barcode scanned:', barcode);
              scannedBarcode2 = barcode;
              processedRFIDs[rfid].barcode2 = barcode;  // Link second barcode with the RFID
            }

            console.log("barcode", scannedBarcode1);

            if (scannedBarcode1) {
              const Module_Code1 = scannedBarcode1 && scannedBarcode1.split('_')[0];
              console.log("Module Code 1:", Module_Code1);

              if (Module_Code1 === "24S01P") {
                console.log("double module")
                await processRFIDTags(tags, socket);  // Process RFID tags for Vision 1
              } else {
                 console.log("single module")
                await processRFIDTagsSingle(tags, socket);  // Process RFID tags for Vision 2 or others
              }
            } else {
              console.error("Received invalid barcode:", barcode);
            }

            // Process other modules (Vision 2, Welding, FPCB) based on valid RFID
            if (tags.vision2?.RFID && tags.vision2.RFID !== 'DA' && tags.vision2.RFID !== 0) {
              console.log('Processing Vision 2 RFID:', tags.vision2.RFID);
              await processVision2(tags, socket);
            }

            if (tags.welding?.RFID && tags.welding.RFID !== 'DA' && tags.welding.RFID !== 0) {
              console.log('Processing Welding RFID:', tags.welding.RFID);
              await processWelding(tags, socket);
            }

            if (tags.fpcb?.RFID && tags.fpcb.RFID !== 'DA' && tags.fpcb.RFID !== 0) {
              console.log('Processing FPCB RFID:', tags.fpcb.RFID);
              await processFpcb(tags, socket);
            }

          } catch (e) {
            console.error('Error parsing RFID tags:', e.message);
          }
        } else {
          // Handle barcode input (string format)
          barcode = jsonString;
          console.log('Received barcode:', barcode);

          // Process barcode and link it to the corresponding RFID
          try {
            const apiUrl = 'http://127.0.0.1:4000/checkBarcode';
            const response = await axios.post(apiUrl, { scannedBarcode: barcode });

            const message = response.data.message;
            console.log(`API Response: ${message}`);

            // Broadcast barcode scan message
            broadcast({ message: 'Barcode Scanned', barcode });

            // Check if the module is complete for sorting
            if (message === 'Module complete in cell sorting.') {
              broadcast({ message: 'Module complete in cell sorting!', barcode });

              const module_code = barcode.split('_')[0];  // Extract module code from barcode
              const request = new sql.Request(mainPool);
              const result = await request.input('module_code', sql.VarChar, module_code)
                .query(`SELECT no_of_modules FROM vision_pack_master WHERE module_code = '${module_code}'`);

              // Convert module count to integer
              const moduleCount = parseInt(result.recordset[0].no_of_modules, 10);

              console.log("ModuleCount", moduleCount);

              if (module_code == "24S01P") {
                // Process multiple modules
                await multiplemodule(barcode, socket);

                // Process RFID tags if both barcodes are scanned and RFID is valid
                if (scannedBarcode1 && scannedBarcode2 && tags?.vision1?.RFID && tags.vision1.RFID !== 'DA') {
                  console.log('Both barcodes scanned, processing RFID tags for both modules.');
                  await processRFIDTags(tags, socket);
                } else if (scannedBarcode1 && !scannedBarcode2) {
                  console.log('Waiting for second barcode to complete the module.');
                }

              } else {

                // Process single module
                await singlemodule(barcode, socket);

                // Process RFID tags for Vision 1 if valid and available
                if (tags?.vision1?.RFID && tags.vision1.RFID !== 'DA') {
                  console.log('Processing RFID tags for single module');
                  await processRFIDTagsSingle(tags, socket);
                } else {
                  console.log('Waiting for valid RFID tags for Vision 1...');
                }

              }
            } else {
              console.log('Module is not complete. Halting further processing.');
              broadcast({ message: 'Module is not complete in Cell Sorting!', barcode });
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
    // console.log('More than 2 barcodes scanned, waiting for new RFID...');
  }
}

async function singlemodule(barcode, socket) {
  console.log(`Single module processing for11111111111: ${barcode}`);

  // Check if the barcode is already scanned, if not, set it as the scanned barcode
  if (!scannedBarcode1) {
    scannedBarcode1 = barcode;
    console.log('Single module barcode scanned successfully11111111111:', scannedBarcode1);

    if (socket && socket.write) {
      broadcast({ message: 'Module Barcode Scanned Successfully!' });
      console.log("Module Barcode Scanned Successfully!");

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
  const maxRetries = 80;       // Maximum attempts before timing out

  for (let i = 0; i < maxRetries; i++) {
    if (tags && tags.vision1) {
      console.log('RFID tags received, processing now...');
      await processRFIDTagsSingle(tags, socket);
      return;
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
    // Send a message to frontend, 2nd module barcode successfully scanned
    broadcast({ message: '1st Module Barcode Scanned Successfully!', barcode });

  } else if (!scannedBarcode2 && barcode !== scannedBarcode1) {
    scannedBarcode2 = barcode;
    console.log('2nd module barcode scanned successfully:', scannedBarcode2);

    // Send a message to frontend, 2nd module barcode successfully scanned
    broadcast({ message: '2nd Module Barcode Scanned Successfully!', barcode });

    // wait for tags to proceed
    if (tags) {
      await processRFIDTags(tags, socket);
    } else {
      console.log('Waiting for RFID tags...');
    }
  } else if (barcode === scannedBarcode1) {
    console.log('1st module barcode already scanned. Waiting for the 2nd module.');
  }
}

// Function to process RFID tags and link to a single barcode
async function processRFIDTagsSingle(tags, socket) {

  const curdate = new Date();
  const yr = curdate.getFullYear();
  const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  const day = ("0" + curdate.getDate()).slice(-2);
  const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;
  // console.log("today_date Vision1::", today_date);

  if (!tags.vision1 || !tags.vision1.RFID) {
    console.error("No valid vision1 RFID received or vision1 is null/undefined.");
    return;
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
    console.log("singleBarcode found processRFIDSingle::", singleBarcode)

    if (!singleBarcode) {
         console.error('Scanned barcode is undefined. Unable to link RFID.');
      return;
    }

    // Insert/update in linking_module_RFID table when status is false
    if (!tags.vision1.OKStatus || !tags.vision1.NOKStatus) {
      // RFID exists, update with the single barcode if necessary
      if (RFID != 0) {
        if (result.recordset.length > 0) {
          const updateQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET module_barcode = '${singleBarcode}', v1_live_status = 1, date_time = GETDATE() WHERE RFID = '${RFID}'`;
          await request.query(updateQuery);
          console.log(`Updated entry for RFID: ${RFID}`);
        } else {
          // New RFID, insert new record
          const insertQuery = `INSERT INTO [replus_treceability].[dbo].[linking_module_RFID] (RFID, module_barcode, v1_live_status, date_time) VALUES ('${RFID}', '${singleBarcode}', 1, '${today_date}')`;
          await request.query(insertQuery);
          console.log(`Inserted new record for RFID: ${RFID}`);
        }
      }
      const result1 = await request.query(selectQuery);

      // If result1.recordset is an array and you want to access the first element
      const record = result1.recordset[0]; // Access the first record
       

      if (record && record.module_barcode !== '' && record.RFID !== '' && record.RFID !== null) {
        console.log(record);
        // Send success message to frontend for linking
        broadcast({ message: 'Module Barcode and RFID linked successfully!!!' });
        console.log("Module Barcode and RFID linked successfully!!!");

        // Write the CycleStartConfirm tag to true for Vision1
        await writeCycleStartConfirm(tags.vision1.RFID, socket, true);
        const insertQuery = `
        IF NOT EXISTS (
            SELECT 1 
            FROM [replus_treceability].[dbo].[clw_station_status] 
            WHERE module_barcode = '${singleBarcode}'
        )
        BEGIN
            INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, RFID, v1_start_date)
            VALUES ('${singleBarcode}', '${RFID}', GETDATE())
        END
    `;
    await request.query(insertQuery);

        console.log(insertQuery);
      } else {
        console.log("Module Barcode and RFID not linked!!!");
      }
    }


    // If OKStatus or NOKStatus is true, insert/update in clw_station_status table
    console.log(tags.vision1.OKStatus, tags.vision1.NOKStatus);
    if (tags.vision1.OKStatus || tags.vision1.NOKStatus) {
    
      console.log('Status is true, proceeding to update clw_station_status for single module.');
      await processVision1Single(singleBarcode, tags, socket);

      resetVariables();
    }
  } catch (error) {
    console.error('Error handling RFID tags for single module:', error.message);
  }
}

// Function to process RFID tags and link to a multiple barcode 
async function processRFIDTags(tags, socket) {

  const curdate = new Date();
  const yr = curdate.getFullYear();
  const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  const day = ("0" + curdate.getDate()).slice(-2);
  const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;
  // console.log("today_date Vision1::", today_date);

  if (!tags.vision1 || !tags.vision1.RFID) {
    console.error("No valid vision1 RFID received or vision1 is null/undefined.");
    return;
  }
  const RFID = tags.vision1.RFID;
  console.log("Processing RFID for multiple modules:", RFID);

  try {
    const request = new sql.Request(mainPool);

    // Combine both barcodes
    let combinedBarcodes = `${scannedBarcode1},${scannedBarcode2}`;
    let Double_module_barcode = null;
    // Check if RFID exists in the database and update
    const selectQuery = `SELECT RFID, module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`;
    const result = await request.query(selectQuery);
if(RFID != 0){
    if (result.recordset.length > 0) {
      const updateQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET module_barcode = '${combinedBarcodes}', v1_live_status = 1, date_time = '${today_date}' WHERE RFID = '${RFID}'`;
      await request.query(updateQuery);
      console.log(`Updated RFID: ${RFID} with barcodes: ${combinedBarcodes}`);
    } else {
      const insertQuery = `INSERT INTO [replus_treceability].[dbo].[linking_module_RFID] (RFID, module_barcode, v1_live_status, date_time) VALUES ('${RFID}', '${combinedBarcodes}', 1, '${today_date}')`;
      await request.query(insertQuery);
      console.log(`Inserted new record for RFID: ${RFID} with barcodes: ${combinedBarcodes}`);
    }
}
    // Send message to frontend
    broadcast({ message: 'Module Barcode and RFID linked successfully' });
    console.log("Module Barcode and RFID linked successfully");
  const result1 = await request.query(selectQuery);
     const record = result1 && result1.recordset && result1.recordset[0];
      if (record && record.module_barcode !== '' && record.RFID !== '' && record.RFID !== null && (tags.vision1.OKStatus !== true && tags.vision1.NOKStatus !== true)) {
          // Write the CycleStartConfirm tag to true for Vision1 for multiple barcodes
          await writeCycleStartConfirm(tags.vision1.RFID, socket, true);

          const statusChangeMessage = {tag: 'CycleStartConfirm', RFID: RFID, status: 'changed to true'};
          socket.write(JSON.stringify(statusChangeMessage));
          console.log('CycleStartConfirm written for first Vision1.');

          const insertQuery1 = `
          IF NOT EXISTS (
              SELECT 1 
              FROM [replus_treceability].[dbo].[clw_station_status] 
              WHERE module_barcode = '${scannedBarcode1}'
          )
          BEGIN
              INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, RFID, v1_start_date)
              VALUES ('${scannedBarcode1}', '${RFID}', GETDATE())
          END
      `;
      await request.query(insertQuery1);


      const insertQuery2 = `
      IF NOT EXISTS (
          SELECT 1 
          FROM [replus_treceability].[dbo].[clw_station_status] 
          WHERE module_barcode = '${scannedBarcode2}'
      )
      BEGIN
          INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, RFID, v1_start_date)
          VALUES ('${scannedBarcode2}', '${RFID}', GETDATE())
      END
  `;
  await request.query(insertQuery2);
  
      }
 
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
      resetVariables(); //Reset the barcodes
    }
    // Reset tags only after everything is processed
    tags = null;
    console.log("RFID tags have been reset.");
  }
}

async function writeCycleStartConfirm(RFID, socket, value) {
  try {
    const payload = JSON.stringify({
      tag: 'CycleStartConfirm',
      value: value, // send true or false
      RFID: RFID,
      station: 'vision1'
    });

    // Send payload to the client through the TCP socket
    socket.write(payload);
    console.log("payload_VISION1......", payload)
    console.log(`Sent CycleStartConfirm set to ${value} for RFID: ${RFID} IN VISION1`);
  } catch (error) {
    console.error('Error communicating with client:', error.message);
  }
}

async function writeCycleStartConfirmvision2(RFID, socket, value) {
  try {
    const payload = JSON.stringify({
      tag: 'CycleStartConfirm',
      value: value, // send true or false
      RFID: RFID,
      station: 'vision2'
    });

    // Send payload to the client through the TCP socket
    socket.write(payload);
    console.log("payload_VISION2......", payload)
    console.log(`Sent CycleStartConfirm set to ${value} for RFID: ${RFID} IN VISION2`);
  } catch (error) {
    console.error('Error communicating with client:', error.message);
  }
}

async function writeCycleStartConfirmwelding(RFID, socket, value) {
  try {
    const payload = JSON.stringify({
      tag: 'CycleStartConfirm',
      value: value, // send true or false
      RFID: RFID,
      station: 'welding'
    });

    // Send payload to the client through the TCP socket
    socket.write(payload);
    console.log("payload_WELDING......", payload)
    console.log(`Sent CycleStartConfirm set to ${value} for RFID: ${RFID} IN WELDING`);
  } catch (error) {
    console.error('Error communicating with client:', error.message);
  }
}

async function writeCycleStartConfirmfpcb(RFID, socket, value) {
  try {
    const payload = JSON.stringify({
      tag: 'CycleStartConfirm',
      value: value, // send true or false
      RFID: RFID,
      station: 'fpcb'
    });

    // Send payload to the client through the TCP socket
    socket.write(payload);
    console.log("payload_FPCB......", payload)
    console.log(`Sent CycleStartConfirm set to ${value} for RFID: ${RFID} IN FPCB `);
  } catch (error) {
    console.error('Error communicating with client:', error.message);
  }
}

// Function to process Vision 1 for single module 
async function processVision1Single(singleBarcode, tags, socket) {

  const curdate = new Date();
  const yr = curdate.getFullYear();
  const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  const day = ("0" + curdate.getDate()).slice(-2);
  const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;
  console.log("End Date  Vision1Single::", today_date);

  console.log(`Processing Vision1 for single barcode: ${singleBarcode}`);

  try {
    const request = new sql.Request(mainPool);

    const RFID = tags.vision1.RFID;
    const statusToStore = tags.vision1.OKStatus ? "OK" : tags.vision1.NOKStatus ? "NOT OK" : null;
    const v1error = tags.vision1.ERRORStatus;
    let errorDescription = null;

    // Check if NOKStatus is true for Vision 1
    if (tags.vision1.NOKStatus) {
      // Fetch the error description from vision1_errorcode_master before updating or inserting into clw_station_status
      const errorQuery = await request.query(`SELECT DISTINCT error_description FROM [replus_treceability].[dbo].[vision1_errorcode_master] WHERE error_code = '${v1error}'`);
      console.log("errorQuery", errorQuery);

      if (errorQuery.recordset.length > 0) {
        errorDescription = errorQuery.recordset[0].error_description;
        console.log("Error Description for Vision1:", errorDescription);
      } else {
        console.log(`No error description found for Vision 1 error code: ${v1error}`);
      }
    }

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    console.log("date time For Vision 1", dateResult);

    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      const globalFormattedDateTime = formatDateTime(dbDate);

      // v1_start_date = '${globalFormattedDateTime}', 

      // Query to check if the module already exists in clw_station_status
      const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${singleBarcode}'`;
      const statusResult = await request.query(selectQuery);

      if (statusResult.recordset.length > 0) {
        // Update the existing record
        const updateQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = '${statusToStore}', v1_error = '${errorDescription}', RFID = '${RFID}',v1_end_date = '${today_date}' WHERE module_barcode = '${singleBarcode}'`;
        await request.query(updateQuery);

        // processing is complete, send CycleStartConfirm to false for Vision1
        await writeCycleStartConfirm(tags.vision1.RFID, socket, false);

        console.log(`Updated Vision1 status for single module: ${singleBarcode}`);
      } else {
        // Insert a new record if the barcode doesn't exist
        const insertQuery = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${singleBarcode}', '${statusToStore}', '${errorDescription}', '${RFID}', '${globalFormattedDateTime}', '${today_date}')`;
        await request.query(insertQuery);

        // processing is complete, send CycleStartConfirm to false for Vision1
        await writeCycleStartConfirm(tags.vision1.RFID, socket, false);

        console.log(`Inserted new Vision1 status for single module: ${singleBarcode}`);
      }
      // update the `v1_live_status` in `linking_module_RFID`
      const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${singleBarcode}'`;
      console.log("updateLinkingQuery::", updateLinkingQuery)

      await request.query(updateLinkingQuery);
      console.log(`Updated v1_live_status`);

      /******************** indrajeet code start **************************/
      const combinedResult1 = await mainPool.request().query(`
      WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${singleBarcode}' ORDER BY sr_no DESC)
      SELECT TOP 1 v1_end_date FROM [dbo].[clw_station_status] WHERE  sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, v1_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

      let previous_v1_end_date = null;
      if (combinedResult1.recordset.length > 0) {
        previous_v1_end_date = combinedResult1.recordset[0].v1_end_date;
      }
      // console.log("vision 1 datee ::", previous_v1_end_date);

      if (previous_v1_end_date != null) {
        globalFormattedDateTime1 = formatDateTime(previous_v1_end_date);

        // console.log("globalFormattedDateTime1::", globalFormattedDateTime1);

        if (globalFormattedDateTime1) {
          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v1_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${singleBarcode}'`);
        } else {
          console.log(`No previous record found for module_barcode: ${singleBarcode}`);
        }

        /******************** To send NOT OK Status in rework table ****************************/
        if (statusToStore === 'NOT OK') {
          await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station, error_description) VALUES ('${singleBarcode}', 'Vision 1', '${errorDescription}')`);
          console.log("Data inserted into replus_NOTOK_history_details for Vision 1");
        }

      } else {
        console.log(`No previous record found for module_barcode: ${singleBarcode}`);
      }
      /******************** indrajeet code end **************************/

      // Notify the frontend
      if (tags.vision1.NOKStatus && errorDescription) {
        broadcast({
          message: `Vision 1 Cycle Completed! Vision1 Status: ${statusToStore}. Error: ${errorDescription}`
        });
      } else {
        broadcast({
          message: `Vision 1 Cycle Completed! Vision1 Status: ${statusToStore}`
        });
      }
      console.log("Vision 1 Cycle Completed!");


      // processing is complete, send CycleStartConfirm to false for Vision1
      // await writeCycleStartConfirm(tags.vision1.RFID, socket, false);

    } else {
      console.error(`No record found for RFID: ${RFID}`);
    }

  } catch (error) {
    console.error('Error processing Vision1 for single module:', error.message);
  }
}

// Function to process Vision 1 for multiple module 
async function processVision1(scannedBarcode1, scannedBarcode2, tags, socket) {

  const curdate = new Date();
  const yr = curdate.getFullYear();
  const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  const day = ("0" + curdate.getDate()).slice(-2);
  const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;
  // console.log("today_date Vision1::", today_date);

  console.log(`Processing Vision1 for barcodes: ${scannedBarcode1}, ${scannedBarcode2}`);

  let combinedBarcodes = `${scannedBarcode1},${scannedBarcode2}`;

  try {
    const request = new sql.Request(mainPool);

    if (!tags || !tags.vision1) {
      throw new Error("Vision 1 data is undefined");
    }

    const RFID = tags.vision1.RFID;
    const statusToStore = tags.vision1.OKStatus ? "OK" : tags.vision1.NOKStatus ? "NOT OK" : null;
    const v1error = tags.vision1.ERRORStatus;
    let errorDescription = "Cell Polarity Is Not OK";
    let ModuleStatus = v1error

    // Check if NOKStatus is true for Vision 1
    // if (tags.vision1.NOKStatus) {
    //   // Fetch the error description from vision1_errorcode_master
    //   const errorQuery = await request.query(`SELECT DISTINCT error_description FROM [replus_treceability].[dbo].[vision1_errorcode_master] WHERE error_code = '${v1error}'`);
    //   if (errorQuery.recordset.length > 0) {
    //     errorDescription = errorQuery.recordset[0].error_description;
    //     console.log("Error Description for Vision1:", errorDescription);
    //   } else {
    //     console.log(`No error description found for Vision 1 error code: ${v1error}`);
    //   }
    // }

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      const globalFormattedDateTime = formatDateTime(dbDate);

      for (const barcode of [scannedBarcode1, scannedBarcode2]) {
        // Check if the module already exists in `clw_station_status`
        const statusCheckQuery = `SELECT module_barcode FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${barcode}'`;
        const statusResult = await request.query(statusCheckQuery);
       


        if (statusToStore == 'OK') {

          if (statusResult.recordset.length > 0) {
            // Update the existing record
            const updateQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = '${statusToStore}', v1_error = 'null', RFID = '${RFID}',  v1_end_date = '${today_date}' WHERE module_barcode = '${barcode}'`;
            await request.query(updateQuery1);

            // const updateQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = '${statusToStore}', v1_error = '${errorDescription}', RFID = '${RFID}',  v1_end_date = '${today_date}' WHERE module_barcode = '${scannedBarcode2}'`;
            // await request.query(updateQuery2);

            console.log(updateQuery1);
            console.log(`Updated clw_station_status for barcode: ${barcode}`);
            
          } else {
            // Insert a new record if it doesn't exist
            const insertQuery = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID,  v1_end_date) VALUES ('${barcode}', '${statusToStore}', 'null', '${RFID}','${today_date}')`;
            await request.query(insertQuery);
            console.log(`Inserted new clw_station_status record for barcode: ${combinedBarcodes}`);

            // update the `v1_live_status` in `linking_module_RFID`
            const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${combinedBarcodes}'`;
            console.log("updateLinkingQuery::", updateLinkingQuery);

            await request.query(updateLinkingQuery);
            console.log(`Updated v1_live_status for barcode: ${combinedBarcodes}`);
          }
          
               await writeCycleStartConfirm(tags.vision1.RFID, socket, false);
              console.log("Cycle Start Comform Tag false for vision 1 cycle complete ");
          broadcast({ message: `${scannedBarcode1} : OK  ${scannedBarcode2} : OK`});

        } else {
          if (ModuleStatus == 42) {

            if (statusResult.recordset.length > 0) {
              // Update the existing record
              const updateQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = 'OK', v1_error = 'null', RFID = '${RFID}',  v1_end_date = '${today_date}' WHERE module_barcode = '${scannedBarcode1}'`;
              await request.query(updateQuery1);
              console.log(`Updated clw_station_status for barcode: ${scannedBarcode1}`);

              const updateQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = 'NOT OK', v1_error = '${errorDescription}', RFID = '${RFID}', v1_end_date = '${today_date}' WHERE module_barcode = '${scannedBarcode2}'`;
              await request.query(updateQuery2);
              console.log(`Updated clw_station_status for barcode: ${scannedBarcode2}`);

              

            } else {
              // Insert a new record if it doesn't exist
              const insertQuery1 = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${scannedBarcode1}', 'OK', 'null', '${RFID}', '${globalFormattedDateTime}', '${today_date}')`;
              await request.query(insertQuery1);
              console.log(`Inserted new clw_station_status record for barcode: ${scannedBarcode1}`);

              const insertQuery2 = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${scannedBarcode2}', 'NOT OK', '${errorDescription}', '${RFID}', '${globalFormattedDateTime}', '${today_date}')`;
              await request.query(insertQuery2);
              console.log(`Inserted new clw_station_status record for barcode: ${scannedBarcode2}`);

              // update the `v1_live_status` in `linking_module_RFID`
              const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${combinedBarcodes}'`;
              console.log("updateLinkingQuery::", updateLinkingQuery);

              await request.query(updateLinkingQuery);
              console.log(`Updated v1_live_status for barcode: ${combinedBarcodes}`);

            }

            broadcast({ message: `${scannedBarcode1} : OK  ${scannedBarcode2} : NOT OK  Error : Cell Polarity Is Not Ok`});

          } else if (ModuleStatus == 41) {


            if (statusResult.recordset.length > 0) {
              // Update the existing record
              const updateQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = 'NOT OK', v1_error = '${errorDescription}', RFID = '${RFID}', v1_end_date = '${today_date}' WHERE module_barcode = '${scannedBarcode1}'`;
              await request.query(updateQuery1);
              console.log(`Updated clw_station_status for barcode: ${scannedBarcode1}`);

              const updateQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = 'OK', v1_error = 'null', RFID = '${RFID}', v1_end_date = '${today_date}' WHERE module_barcode = '${scannedBarcode2}'`;
              await request.query(updateQuery2);
              console.log(`Updated clw_station_status for barcode: ${scannedBarcode2}`);

             

            } else {
              // Insert a new record if it doesn't exist
              const insertQuery1 = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${scannedBarcode1}', 'NOT OK', '${errorDescription}', '${RFID}', '${globalFormattedDateTime}', '${today_date}')`;
              await request.query(insertQuery1);
              console.log(`Inserted new clw_station_status record for barcode: ${scannedBarcode1}`);

              const insertQuery2 = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_start_date, v1_end_date) VALUES ('${scannedBarcode2}', 'OK', '${errorDescription}', '${RFID}', '${globalFormattedDateTime}', '${today_date}')`;
              await request.query(insertQuery2);
              console.log(`Inserted new clw_station_status record for barcode: ${scannedBarcode2}`);

             
              

              // update the `v1_live_status` in `linking_module_RFID`
              const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${combinedBarcodes}'`;
              console.log("updateLinkingQuery::", updateLinkingQuery);

              await request.query(updateLinkingQuery);
              console.log(`Updated v1_live_status for barcode: ${combinedBarcodes}`);

             
            }

            broadcast({ message: `${scannedBarcode1} : Not OK  ${scannedBarcode2} : OK  Error : Cell Polarity Is Not Ok`});

          } else if (ModuleStatus == 43) {

            if (statusResult.recordset.length > 0) {
              // Update the existing record
              const updateQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = 'NOT OK', v1_error = '${errorDescription}', RFID = '${RFID}', v1_end_date = '${today_date}' WHERE module_barcode = '${scannedBarcode1}'`;
              await request.query(updateQuery1);
              console.log(`Updated clw_station_status for barcode: ${scannedBarcode1}`);

              const updateQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v1_status = 'NOT OK', v1_error = '${errorDescription}', RFID = '${RFID}', v1_end_date = '${today_date}' WHERE module_barcode = '${scannedBarcode2}'`;
              await request.query(updateQuery2);
              console.log(`Updated clw_station_status for barcode: ${scannedBarcode2}`);

               // After completing Vision1 cycle, set to false
              await writeCycleStartConfirm(tags.vision1.RFID, socket, false);

            } else {
              // Insert a new record if it doesn't exist
              const insertQuery1 = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_end_date) VALUES ('${scannedBarcode1}', 'NOT OK', '${errorDescription}', '${RFID}','${today_date}')`;
              await request.query(insertQuery1);
              console.log(`Inserted new clw_station_status record for barcode: ${scannedBarcode1}`);

              const insertQuery2 = `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, v1_status, v1_error, RFID, v1_end_date) VALUES ('${scannedBarcode2}', 'NOT OK', '${errorDescription}', '${RFID}','${today_date}')`;
              await request.query(insertQuery2);
              console.log(`Inserted new clw_station_status record for barcode: ${scannedBarcode2}`);

                 // After completing Vision1 cycle, set to false
               await writeCycleStartConfirm(tags.vision1.RFID, socket, false);

              // update the `v1_live_status` in `linking_module_RFID`
              const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${combinedBarcodes}'`;
              console.log("updateLinkingQuery::", updateLinkingQuery);

              await request.query(updateLinkingQuery);
              console.log(`Updated v1_live_status for barcode: ${combinedBarcodes}`);
            }

               await writeCycleStartConfirm(tags.vision1.RFID, socket, false);
              console.log("Cycle Start Comform Tag false for vision 1 cycle complete ");
            broadcast({ message: `${scannedBarcode1} : Not Ok  ${scannedBarcode2} : Not Ok  Error : Cell Polarity Is Not Ok`});

          }
          else {
            console.log("Module Not Found ............");
          }



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
            await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station, remark) VALUES ('${barcode}', 'Vision 1', '${errorDescription}')`);
            console.log("Data inserted into replus_NOTOK_history_details for Vision 1");
          }
        } else {
          console.log(`No previous record found for module_barcode: ${barcode}`);
        }
        /******************** indrajeet code end **************************/
      }

      // Notify frontend with status and error if applicable
      if (tags.vision1.OKStatus && errorDescription) {
        broadcast({ message: `Vision 1 Cycle Completed! Vision1 Status: ${statusToStore}. Error: ${errorDescription}` });
      } else {
        broadcast({ message: `Vision 1 Cycle Completed! Vision1 Status: ${statusToStore}` });
      }
      console.log("Vision 1 Cycle Completed!");

      // After completing Vision1 cycle, set to false
      await writeCycleStartConfirm(tags.vision1.RFID, socket, false);

      tags = null;
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
  scannedBarcodes = [];
  console.log("Global variables have been reset.");
}

// Function to process Vision 2  
async function processVision2(tags, socket) {

  const curdate = new Date();
  const yr = curdate.getFullYear();
  const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  const day = ("0" + curdate.getDate()).slice(-2);
  const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;

  const RFID = tags.vision2.RFID;
  console.log("Processing RFID for Vision 2 : ", RFID);
  const v2Error = tags.vision2.ERRORStatus;
  let ModuleStatus = v2Error

  try {
    const request = new sql.Request(mainPool);
    let errorDescription = "Bus Bar Orientation Not Ok";

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time, module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);

    const MODULE_BARCODE_CLW = await request.query(`SELECT TOP 1 module_barcode FROM [replus_treceability].[dbo].[clw_station_status] WHERE RFID = '${RFID}' ORDER BY sr_no DESC`);
    console.log("MODULE_BARCODE_CLW12333333", MODULE_BARCODE_CLW);

    const Double_module_barcode = await request.query(`WITH RankedRecords AS (SELECT [module_barcode], [v1_end_date], ROW_NUMBER() OVER (PARTITION BY [v1_end_date] ORDER BY [v1_end_date] DESC) AS RowNum FROM [replus_treceability].[dbo].[clw_station_status] WHERE [RFID] = '${RFID}') SELECT [module_barcode], [v1_end_date] FROM RankedRecords WHERE RowNum <= 2 ORDER BY [v1_end_date] DESC;`);

    console.log("Double1233333 ",Double_module_barcode.recordset[0].module_barcode);

    let module_barcode1 = Double_module_barcode.recordset[0].module_barcode;

    console.log(Double_module_barcode.recordset[1].module_barcode);

    let module_barcode2 = Double_module_barcode.recordset[1].module_barcode;

    console.log("Double_module_barcode", Double_module_barcode);
    // const Double_barcode = Double_module_barcode.map(record => record.module_barcode).join(", ");
    const Double_barcode = `${Double_module_barcode.recordset[0].module_barcode} ,${Double_module_barcode.recordset[1].module_barcode}`

    console.log("Vision Double barcodesString", Double_barcode);

    let moduleBarcode = null;

    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;
      if (Array.isArray(Double_module_barcode.recordset) && Double_module_barcode.recordset.length > 0) {
        console.log("Vision 2 Double ");
        moduleBarcode = Double_barcode

      } else {
        console.log("Vision 2 Single ");
        moduleBarcode = MODULE_BARCODE_CLW.recordset[0].module_barcode;
      }

      console.log("moduleBarcode:::", moduleBarcode);
      console.log("dbDate:::", dbDate);

      const globalFormattedDateTime = formatDateTime(dbDate);
      // Split the moduleBarcode into individual barcodes
      const moduleBarcodes = moduleBarcode.split(',');

      for (const barcode of moduleBarcodes) {
        // Trim the barcode in case of leading/trailing spaces
        const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${barcode.trim()}'`;
        console.log("selectQuery::", selectQuery);

        const result = await request.query(selectQuery);

        if (result.recordset.length > 0) {
          // Both OKStatus and NOKStatus are false, update v2_live_status
          if (!tags.vision2.OKStatus && !tags.vision2.NOKStatus) {

            const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = 1, date_time = GETDATE() WHERE module_barcode = '${moduleBarcode}'`;
            console.log("updateLinkingQuerpppppy", updateLinkingQuery);

            await request.query(updateLinkingQuery);
            console.log(`Updated v2_live_status for RFID: ${RFID}`);
            console.log(result.recordset[0])
            if (result.recordset[0].v1_status === "OK" && RFID != 0 && RFID != 'DA' && result.recordset[0].v2_status !== "OK" && (tags.vision2.OKStatus !== true && tags.vision2.NOKStatus !== true)) {
              await writeCycleStartConfirmvision2(tags.vision2.RFID, socket, true);


              const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_start_date =  GETDATE()  WHERE module_barcode = '${barcode}'`;
                await request.query(updateClwStationQuery1);

            }

          }

          // Either OKStatus or NOKStatus is true, update Vision 2 status
          if (tags.vision2.OKStatus || tags.vision2.NOKStatus) {
            const statusToStore = tags.vision2.OKStatus ? "OK" : "NOT OK";
       

            /******************** Add Error Lookup ************************/
            // if (tags.vision2.NOKStatus) {
            //   const errorQuery = await request.query(`SELECT DISTINCT error_description FROM [replus_treceability].[dbo].[vision2_errorcode_master] WHERE error_code = '${v2Error}'`);
            //   if (errorQuery.recordset.length > 0) {
            //     errorDescription = errorQuery.recordset[0].error_description;
            //     console.log("Error Description for Vision2:", errorDescription);
            //   } else {
            //     console.log(`No error description found for Vision 2 error code: ${v2Error}`);
            //   }
            // }
            /*************************************************************/
            if (statusToStore === "OK") {

              const updateClwStationQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = '${statusToStore}', v2_error = '${errorDescription || v2Error}', v2_end_date = '${today_date}' WHERE module_barcode = '${barcode.trim()}'`;
              await request.query(updateClwStationQuery);

              await writeCycleStartConfirmvision2(tags.vision2.RFID, socket, false);
              console.log(`Updated Vision 2 status for RFID: ${RFID}`);

              broadcast({ message: `${scannedBarcode1} : Ok  ${scannedBarcode2} : Ok `});

            } else {

              if (ModuleStatus == 42) {

                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = 'OK', v2_error = 'null', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = 'NOT OK', v2_error = '${errorDescription || v2Error}', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
                await writeCycleStartConfirmvision2(tags.vision2.RFID, socket, false);
                console.log(`Updated Vision 2 status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} : Ok  ${scannedBarcode2} : Not Ok  Error : Bus Bar Orientation Is Not Ok`});

              }
              else if (ModuleStatus == 41) {

                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = 'NOT OK', v2_error = '${errorDescription || v2Error}', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = 'OK', v2_error = 'null', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
                await writeCycleStartConfirmvision2(tags.vision2.RFID, socket, false);
                console.log(`Updated Vision 2 status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Not Ok  ${scannedBarcode2} : Ok  Error : Bus Bar Orientation Is Not Ok`});

              }
              else if (ModuleStatus == 43) {

                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = 'NOT OK', v2_error = '${errorDescription || v2Error}', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = 'NOT OK', v2_error = '${errorDescription || v2Error}', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
                await writeCycleStartConfirmvision2(tags.vision2.RFID, socket, false);
                console.log(`Updated Vision 2 status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Not Ok  ${scannedBarcode2} : Not Ok  Error : Bus Bar Orientation Is Not Ok`});
              } else {
                console.log("Module status Not found");
              }
            }


            // update the `v1_live_status` in `linking_module_RFID`
            const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v2_live_status = '0'`;
            await request.query(updateLinkingQuery);
            console.log(`Updated v2_live_status`);

            /******************** indrajeet code start **************************/
            const combinedResult1 = await mainPool.request().query(`
              WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${barcode.trim()}' ORDER BY sr_no DESC)
              SELECT TOP 1 v2_end_date FROM [dbo].[clw_station_status] WHERE  sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, v2_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

            let previous_v2_end_date = null;
            if (combinedResult1.recordset.length > 0) {
              previous_v2_end_date = combinedResult1.recordset[0].v2_end_date;
            }
            console.log("vision 2 datee ::", previous_v2_end_date);

            if (previous_v2_end_date != null) {
              globalFormattedDateTime1 = formatDateTime(previous_v2_end_date);

              console.log("globalFormattedDateTime1::", globalFormattedDateTime1);

              if (globalFormattedDateTime1) {
                await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v2_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${barcode.trim()}'`);
              } else {
                console.log(`No previous record found for module_barcode: ${barcode.trim()}`);
              }

              /******************** To send NOT OK Status in rework table ****************************/
              if (statusToStore === 'NOT OK') {
                await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station, remark) VALUES ('${barcode.trim()}', 'Vision 2', '${errorDescription || ''}')`);
                console.log("Data inserted into replus_NOTOK_history_details for Vision 2");
              }
            } else {
              console.log(`No previous record found for module_barcode: ${barcode.trim()}`);
            }
            /******************** indrajeet code end **************************/

            // Notify frontend with status and error if applicable
            if (tags.vision2.NOKStatus && errorDescription) {
              broadcast({ message: `Vision 2 Cycle Completed! Vision 2 Status: ${statusToStore}. Error: ${errorDescription}` });
            } else {
              broadcast({ message: `Vision 2 Cycle Completed! Vision 2 Status: ${statusToStore}` });
            }
            console.log("Vision 2 Cycle Completed!");

            // After completing Vision2 cycle, set it back to false
           // await writeCycleStartConfirmvision2(tags.vision2.RFID, socket, false);
          }
        } else {
          console.error(`No record found for module_barcode: ${barcode.trim()}`);
        }
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

  const curdate = new Date();
  const yr = curdate.getFullYear();
  const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  const day = ("0" + curdate.getDate()).slice(-2);
  const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;
  // console.log("today_date Welding::", today_date);

  const RFID = tags.welding.RFID;
  console.log("Processing Welding for RFID:", RFID);

  const weldingError = tags.welding.ERRORStatus;

  let ModuleStatus = weldingError

  try {
    const request = new sql.Request(mainPool);
    let errorDescription = "Robot Welding Is Not Ok";


    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time, module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);

    const MODULE_BARCODE_CLW = await request.query(`SELECT TOP 1 module_barcode FROM [replus_treceability].[dbo].[clw_station_status] WHERE RFID = '${RFID}' ORDER BY sr_no DESC`);

    const Double_module_barcode = await request.query(`WITH RankedRecords AS (SELECT [module_barcode], [v1_end_date], ROW_NUMBER() OVER (PARTITION BY [v1_end_date] ORDER BY [v1_end_date] DESC) AS RowNum FROM [replus_treceability].[dbo].[clw_station_status] WHERE [RFID] = '${RFID}') SELECT [module_barcode], [v1_end_date] FROM RankedRecords WHERE RowNum <= 2 ORDER BY [v1_end_date] DESC;`);

    let module_barcode1 = Double_module_barcode.recordset[0].module_barcode;

    console.log(Double_module_barcode.recordset[0].module_barcode);

    let module_barcode2 = Double_module_barcode.recordset[1].module_barcode;

    console.log(Double_module_barcode.recordset[1].module_barcode);
    console.log("Double_module_barcode", Double_module_barcode);
    // const Double_barcode = Double_module_barcode.map(record => record.module_barcode).join(", ");
    const Double_barcode = `${Double_module_barcode.recordset[0].module_barcode} ,${Double_module_barcode.recordset[1].module_barcode}`

    console.log("Welding Double barcodesString", Double_barcode);



    let moduleBarcode = null;



    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;

      if (Array.isArray(Double_module_barcode.recordset) && Double_module_barcode.recordset.length > 0) {
        console.log("Welding Double ");
        moduleBarcode = Double_barcode

      } else {
        console.log("Welding Single ");
        moduleBarcode = MODULE_BARCODE_CLW.recordset[0].module_barcode;
      }

      console.log("moduleBarcode:::", moduleBarcode);
      console.log("dbDate:::", dbDate);

      const globalFormattedDateTime = formatDateTime(dbDate);
      // console.log("Global Formatted DateTime for Welding::", globalFormattedDateTime);

      // Split the moduleBarcode into individual barcodes
      const moduleBarcodes = moduleBarcode.split(',');

      for (const barcode of moduleBarcodes) {
        // Trim the barcode in case of leading/trailing spaces
        const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${barcode.trim()}'`;
        const result = await request.query(selectQuery);

        if (result.recordset.length > 0) {
          // Update welding_live_status if both OKStatus and NOKStatus are false
          if (!tags.welding.OKStatus && !tags.welding.NOKStatus) {
            const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET welding_live_status = 1, date_time = GETDATE() WHERE module_barcode = '${moduleBarcode}'`;
            await request.query(updateLinkingQuery);
            console.log(`Updated welding_live_status for RFID: ${RFID}`);

            if (result.recordset[0].v2_status === "OK" && RFID != 0 && RFID != "DA" && result.recordset[0].welding_status !== "OK" && result.recordset[0].welding_status !== "NOT OK" && (tags.welding.OKStatus !== true && tags.welding.NOKStatus !== true)) {
              // processing is complete, send CycleStartConfirm to true
              await writeCycleStartConfirmwelding(tags.welding.RFID, socket, true);

              const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_start_date = GETDATE() WHERE module_barcode = '${barcode}'`;
                await request.query(updateClwStationQuery1);

                console.log("quey welding start date update ",updateClwStationQuery1);

            }
          }

          // Update Welding status when either OKStatus or NOKStatus is true
          if (tags.welding.OKStatus || tags.welding.NOKStatus) {
            const statusToStore = tags.welding.OKStatus ? "OK" : "NOT OK";
            
            const WeldingCorePower = tags.welding.WeldingCorePower;
            const WeldingRadius = tags.welding.WeldingRadius;
            const WeldingRingPower = tags.welding.WeldingRingPower;
            const WeldingSpeed = tags.welding.WeldingSpeed;


            /******************** Add Error Lookup ************************/
            // if (tags.welding.NOKStatus) {
            //   const errorQuery = await request.query(`SELECT DISTINCT error_description FROM [replus_treceability].[dbo].[welding_errorcode_master] WHERE error_code = '${weldingError}'`);
            //   if (errorQuery.recordset.length > 0) {
            //     errorDescription = errorQuery.recordset[0].error_description;
            //     console.log("Error Description for Welding:", errorDescription);
            //   } else {
            //     console.log(`No error description found for Welding error code: ${weldingError}`);
            //   }
            // }
            /*************************************************************/

            // const updateClwStationQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = '${statusToStore}', welding_error = '${errorDescription}', welding_start_date = '${globalFormattedDateTime}', welding_end_date = '${today_date}', Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${barcode.trim()}'`;


            if (statusToStore === "OK") {
              const updateClwStationQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = '${statusToStore}', welding_error = '${errorDescription}', welding_end_date = '${today_date}',  Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${barcode.trim()}'`;

              await request.query(updateClwStationQuery);
              console.log(`Updated Welding status for RFID: ${RFID}`);
              await writeCycleStartConfirmwelding(tags.welding.RFID, socket, false);

              broadcast({ message: `${scannedBarcode1} :Ok  ${scannedBarcode2} : Ok `});

            } else {

              if (ModuleStatus == 42) {

                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = 'OK', welding_error = 'null', welding_end_date = '${today_date}',  Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = 'NOT OK', welding_error = '${errorDescription}', welding_end_date = '${today_date}', Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
               await writeCycleStartConfirmwelding(tags.welding.RFID, socket, false);
                console.log(`Updated welding status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Ok  ${scannedBarcode2} : Not Ok  Error : Robot Welding Is Not Ok`});

              }
              else if (ModuleStatus == 41) {

                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = 'NOT OK', welding_error = '${errorDescription}', welding_end_date = '${today_date}', Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = 'OK', welding_error = 'null', welding_end_date = '${today_date}', Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
               await writeCycleStartConfirmwelding(tags.welding.RFID, socket, false);
                console.log(`Updated welding status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Not Ok  ${scannedBarcode2} : Ok  Error : Robot Welding Is Not Ok`});

              }
              else if (ModuleStatus == 43) {

                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = 'NOT OK', welding_error = '${errorDescription}', welding_end_date = '${today_date}', Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = 'NOT OK', welding_error = '${errorDescription}', welding_end_date = '${today_date}',  Robot_Welding_Core_Power = '${WeldingCorePower}', Robot_Welding_Radius = '${WeldingRadius}', Robot_Welding_Ring_Power = '${WeldingRingPower}', Robot_Welding_Speed = '${WeldingSpeed}' WHERE module_barcode = '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
               await writeCycleStartConfirmwelding(tags.welding.RFID, socket, false);
                console.log(`Updated welding status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Not Ok  ${scannedBarcode2} :Not Ok  Error : Robot Welding Is Not Ok`});

              } else {
                console.log("Module status Not found");
              }
            }


            // update the `welding_live_status` in `linking_module_RFID`
            const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET welding_live_status = '0'`;
            await request.query(updateLinkingQuery);
            console.log(`Updated welding_live_status`);

            /******************** indrajeet code start **************************/
            const combinedResult1 = await mainPool.request().query(`
              WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${barcode.trim()}' ORDER BY sr_no DESC)
              SELECT TOP 1 welding_end_date FROM [dbo].[clw_station_status] WHERE sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, welding_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

            let previous_welding_end_date = null;
            if (combinedResult1.recordset.length > 0) {
              previous_welding_end_date = combinedResult1.recordset[0].welding_end_date;
            }
            console.log("previous_welding_end_date::", previous_welding_end_date);

            if (previous_welding_end_date != null) {
              const globalFormattedDateTime1 = formatDateTime(previous_welding_end_date);
              console.log("globalFormattedDateTime1::", globalFormattedDateTime1);

              if (globalFormattedDateTime1) {
                await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_difference = DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}') WHERE module_barcode = '${barcode.trim()}'`);
              } else {
                console.log(`No previous record found for module_barcode: ${barcode.trim()}`);
              }

              /******************** To send NOT OK Status in rework table ****************************/
              if (statusToStore === 'NOT OK') {
                await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station, remark) VALUES ('${barcode.trim()}', 'Welding', '${errorDescription}')`);
                console.log("Data inserted into replus_NOTOK_history_details for Welding");
              }
            } else {
              console.log(`No previous record found for module_barcode: ${barcode.trim()}`);
            }
            /******************** indrajeet code end **************************/

            // Notify frontend with status and error if applicable
            if (tags.welding.NOKStatus && errorDescription) {
              broadcast({ message: `Welding Cycle Completed! Welding Status: ${statusToStore}. Error: ${errorDescription}` });
            } else {
              broadcast({ message: `Welding Cycle Completed! Welding Status: ${statusToStore}` });
            }
            console.log("Welding Cycle Completed!");

            // After processing completing, set it back to false
            //await writeCycleStartConfirmwelding(tags.welding.RFID, socket, false);
          }
        } else {
          console.error(`No record found for module_barcode: ${barcode.trim()}`);
        }
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

  const curdate = new Date();
  const yr = curdate.getFullYear();
  const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  const day = ("0" + curdate.getDate()).slice(-2);
  const today_date = `${yr}-${month}-${day} ${curdate.getHours()}:${curdate.getMinutes()}:${curdate.getSeconds()}`;

  const RFID = tags.fpcb.RFID;
  console.log("Processing FPCB for RFID:", RFID);
  const fpcbError = tags.fpcb.ERRORStatus;

  let ModuleStatus = fpcbError
  try {
    const request = new sql.Request(mainPool);
    let errorDescription = "FPCB Not Ok";

    // Get the date_time for the given RFID
    const dateResult = await request.query(`SELECT date_time, module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    const MODULE_BARCODE_CLW = await request.query(`SELECT TOP 1 module_barcode FROM [replus_treceability].[dbo].[clw_station_status] WHERE RFID = '${RFID}' ORDER BY sr_no DESC`);

    const Double_module_barcode = await request.query(`WITH RankedRecords AS (SELECT [module_barcode], [v1_end_date], ROW_NUMBER() OVER (PARTITION BY [v1_end_date] ORDER BY [v1_end_date] DESC) AS RowNum FROM [replus_treceability].[dbo].[clw_station_status] WHERE [RFID] = '${RFID}') SELECT [module_barcode], [v1_end_date] FROM RankedRecords WHERE RowNum <= 2 ORDER BY [v1_end_date] DESC;`);

    let module_barcode1 = Double_module_barcode.recordset[0].module_barcode;

    console.log(Double_module_barcode.recordset[0].module_barcode);

    let module_barcode2 = Double_module_barcode.recordset[1].module_barcode;

    console.log(Double_module_barcode.recordset[1].module_barcode);
    console.log("Double_module_barcode", Double_module_barcode);
    // const Double_barcode = Double_module_barcode.map(record => record.module_barcode).join(", ");
    const Double_barcode = `${Double_module_barcode.recordset[0].module_barcode} ,${Double_module_barcode.recordset[1].module_barcode}`

    console.log("FPCB Double barcodesString", Double_barcode);

    let moduleBarcode = null;

    if (dateResult.recordset.length > 0) {
      const dbDate = dateResult.recordset[0].date_time;

      if (Array.isArray(Double_module_barcode.recordset) && Double_module_barcode.recordset.length > 0) {
        console.log("FPCB Double ");
        moduleBarcode = Double_barcode

      } else {
        console.log("FPCB Single ");
        moduleBarcode = MODULE_BARCODE_CLW.recordset[0].module_barcode;
      }

      const globalFormattedDateTime = formatDateTime(dbDate);
      // Split the moduleBarcode into individual barcodes in case there are multiple
      const moduleBarcodes = moduleBarcode.split(',');

      for (const barcode of moduleBarcodes) {
        const trimmedBarcode = barcode.trim();
        // Check if RFID exists in the database
        const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${trimmedBarcode}'`;
        const result = await request.query(selectQuery);

        if (result.recordset.length > 0) {
          // Update live_status if both OKStatus and NOKStatus are false
          if (!tags.fpcb.OKStatus && !tags.fpcb.NOKStatus) {
            const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = 1, date_time = GETDATE() WHERE module_barcode = '${moduleBarcode}'`;
            await request.query(updateLinkingQuery);
            console.log(`Updated fpcb_live_status for RFID: ${RFID}`);

            if (result.recordset[0].welding_status == "OK" && RFID != 0 && RFID != "DA" && result.recordset[0].fpcb_status !== "OK" && (tags.fpcb.OKStatus !== true && tags.fpcb.NOKStatus !== true)) {
              // When processing starts, set it to true
              await writeCycleStartConfirmfpcb(tags.fpcb.RFID, socket, true);

              const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_start_date = GETDATE() WHERE module_barcode = '${barcode}'`;
              await request.query(updateClwStationQuery1);

            }
          }

          // Update FPCB status when either OKStatus or NOKStatus is true
          if (tags.fpcb.OKStatus || tags.fpcb.NOKStatus) {
            const statusToStore = tags.fpcb.OKStatus ? "OK" : "NOT OK";
            const fpcbRadius = tags.fpcb.FPCBWeldingRadius;
            const fpcbPower = tags.fpcb.FPCBWeldingPower;
            const fpcbSpeed = tags.fpcb.FPCBWeldingSpeed;


            /******************** Add Error Lookup ************************/
            // if (tags.fpcb.NOKStatus) {
            //   const errorQuery = await request.query(`SELECT DISTINCT error_description FROM [replus_treceability].[dbo].[fpcb_errorcode_master] WHERE error_code = '${fpcbError}'`);
            //   if (errorQuery.recordset.length > 0) {
            //     errorDescription = errorQuery.recordset[0].error_description;
            //     console.log("Error Description for FPCB:", errorDescription);
            //   } else {
            //     console.log(`No error description found for FPCB error code: ${fpcbError}`);
            //   }
            // }
            /*************************************************************/



            
            if (statusToStore === "OK") {
              const updateClwStationQuery = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = '${statusToStore}', fpcb_error = '${errorDescription}', fpcb_end_date = '${today_date}', FPCB_Welding_Power = '${fpcbPower}', FPCB_Welding_Radius = '${fpcbRadius}', FPCB_Welding_Speed = '${fpcbSpeed}' WHERE module_barcode = '${trimmedBarcode}'`;

              await request.query(updateClwStationQuery);
              console.log(`Updated FPCB status for RFID: ${RFID}`);
  
              await writeCycleStartConfirmfpcb(tags.fpcb.RFID, socket, false);

              broadcast({ message: `${scannedBarcode1} :Ok  ${scannedBarcode2} :Ok `});

            } else {

              if (ModuleStatus == 42) {

                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = 'OK', fpcb_error = 'null', fpcb_end_date = '${today_date}', FPCB_Welding_Power = '${fpcbPower}', FPCB_Welding_Radius = '${fpcbRadius}', FPCB_Welding_Speed = '${fpcbSpeed}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = 'NOT OK', fpcb_error = '${errorDescription}', fpcb_end_date = '${today_date}', FPCB_Welding_Power = '${fpcbPower}', FPCB_Welding_Radius = '${fpcbRadius}', FPCB_Welding_Speed = '${fpcbSpeed}' WHERE module_barcode =  '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
               await writeCycleStartConfirmfpcb(tags.fpcb.RFID, socket, false);
                console.log(`Updated Vision 2 status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Ok  ${scannedBarcode2} :Not Ok  Error : FPCB Welding Is Not Ok`});

              }
              else if (ModuleStatus == 41) {

               
                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = 'NOT OK', fpcb_error = '${errorDescription}', fpcb_end_date = '${today_date}', FPCB_Welding_Power = '${fpcbPower}', FPCB_Welding_Radius = '${fpcbRadius}', FPCB_Welding_Speed = '${fpcbSpeed}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = 'OK', fpcb_error = 'null', fpcb_end_date = '${today_date}', FPCB_Welding_Power = '${fpcbPower}', FPCB_Welding_Radius = '${fpcbRadius}', FPCB_Welding_Speed = '${fpcbSpeed}' WHERE module_barcode =  '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
  
               await writeCycleStartConfirmfpcb(tags.fpcb.RFID, socket, false);
                console.log(`Updated Vision 2 status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Not Ok  ${scannedBarcode2} :Ok  Error : FPCB Welding Is Not Ok`});

              }
              else if (ModuleStatus == 43) {

               
                const updateClwStationQuery1 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = 'NOT OK', fpcb_error = '${errorDescription}', fpcb_end_date = '${today_date}', FPCB_Welding_Power = '${fpcbPower}', FPCB_Welding_Radius = '${fpcbRadius}', FPCB_Welding_Speed = '${fpcbSpeed}' WHERE module_barcode = '${module_barcode1}'`;
                await request.query(updateClwStationQuery1);

                const updateClwStationQuery2 = `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = 'NOT OK', fpcb_error = '${errorDescription}', fpcb_end_date = '${today_date}', FPCB_Welding_Power = '${fpcbPower}', FPCB_Welding_Radius = '${fpcbRadius}', FPCB_Welding_Speed = '${fpcbSpeed}' WHERE module_barcode =  '${module_barcode2}'`;
                await request.query(updateClwStationQuery2);
               await writeCycleStartConfirmfpcb(tags.fpcb.RFID, socket, false);
                console.log(`Updated Vision 2 status for RFID: ${RFID}`);

                broadcast({ message: `${scannedBarcode1} :Not Ok  ${scannedBarcode2} :Not Ok  Error : FPCB Welding Is Not Ok`});
              } else {
                console.log("Module status Not found");
              }
            }

            // Update the `live_status` in `linking_module_RFID`
            const updateLinkingQuery = `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = '0' WHERE module_barcode = '${moduleBarcode}'`;
            await request.query(updateLinkingQuery);
            console.log(`Updated fpcb_live_status for barcode: ${moduleBarcode}`);

            /******************** indrajeet code start **************************/
            const combinedResult1 = await mainPool.request().query(`
              WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${trimmedBarcode}' ORDER BY sr_no DESC)
              SELECT TOP 1 fpcb_end_date FROM [dbo].[clw_station_status] WHERE  sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, fpcb_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

            let previous_fpcb_end_date = null;
            if (combinedResult1.recordset.length > 0) {
              previous_fpcb_end_date = combinedResult1.recordset[0].fpcb_end_date;
            }
            console.log("fpcb end date ::", previous_fpcb_end_date);

            if (previous_fpcb_end_date != null) {
              const globalFormattedDateTime1 = formatDateTime(previous_fpcb_end_date);

              if (globalFormattedDateTime1) {
                await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_difference = DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}') WHERE module_barcode = '${trimmedBarcode}'`);
              } else {
                console.log(`No previous record found for module_barcode: ${trimmedBarcode}`);
              }

              /******************** To send NOT OK Status in rework table ****************************/
              if (statusToStore === 'NOT OK') {
                await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station, remark) VALUES ('${trimmedBarcode}', 'FPCB', '${errorDescription}')`);
                console.log("Data inserted into replus_NOTOK_history_details for FPCB");
              }
            } else {
              console.log(`No previous record found for module_barcode: ${trimmedBarcode}`);
            }
            /******************** indrajeet code end **************************/

            // Notify frontend with status and error if applicable
            if (tags.fpcb.NOKStatus && errorDescription) {
              broadcast({ message: `FPCB Cycle Completed! FPCB Status: ${statusToStore}. Error: ${errorDescription}` });
            } else {
              broadcast({ message: `FPCB Cycle Completed! FPCB Status: ${statusToStore}` });
            }
            console.log("FPCB Cycle Completed!");

            // After processing completes, set cyclestartconfirm back to false
            //await writeCycleStartConfirmfpcb(tags.fpcb.RFID, socket, false);
          }
        } else {
          console.error(`No record found for module_barcode: ${trimmedBarcode}`);
        }
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
