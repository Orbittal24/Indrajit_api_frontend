// tcplistner.js
const net = require("net");
const sql = require("mssql");
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

// wss.on('connection', (ws) => {
//   console.log('WebSocket client connected');
//   ws.on('close', () => {
//     console.log('WebSocket client disconnected');
//   });
// });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('message', (message) => {
    console.log('Received:', message);
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // ws.send('Hello Client');
});

console.log('WebSocket server running on ws://localhost:8080');

const mainDBConfig = {
  user: "admin2",
  password: "reset@123",
  server: "REP-TRACE",
  database: "replus_treceability",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};
console.log("Connected to", mainDBConfig);

const mainPool = new sql.ConnectionPool(mainDBConfig);
const mainPoolConnect = mainPool.connect();

let globalFormattedDateTime;

function formatDateTime(dateTime) {
  const dateObj = new Date(dateTime);
  const datePart = dateObj.toISOString().split("T")[0];
  const timePart = dateObj.toISOString().split("T")[1].split(".")[0];
  return `${datePart} ${timePart}`;
}

var curdate = new Date();
var yr = curdate.getFullYear();
var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
var day = ("0" + curdate.getDate()).slice(-2);
var today_date = yr + "-" + month + "-" + day + " " + curdate.getHours() + ":" + curdate.getMinutes() + ":" + curdate.getSeconds();
console.log("today_date::", today_date);

var scannedBarcode = "";

function broadcastMessage(message) {
  console.log("Preparing to broadcast message:", message); 
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ message }));
      console.log("Broadcasted message::", message); 
    }
  });
}

const server = net.createServer((socket) => {
  socket.on("data", async (data) => {
    var str = data.toString();
    var checker = str.split(/-(.+)/);

    if (checker[0] == "mcode") {
      console.log("Received mcode data");
      scannedBarcode = checker[1];
      console.log("barcode::::", scannedBarcode);

      let module = scannedBarcode;
      console.log("module:::", module);
      let message = module.length > 0 ? "Module Barcode Scanned Successfully!" : "Module Barcode Not Scanned!";
      broadcastMessage(message);

    } else {
      if (scannedBarcode.length > 0) {
        str = str.replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
        try {
          var jsonObject = JSON.parse(str);
          console.log("jsonObject111::", jsonObject);
        } catch (e) {
          console.error("Parsing error:", e);
        }
        console.log("vision11111111", scannedBarcode);

        await processVision1(jsonObject, scannedBarcode);
        console.log("Vision1_JSONobject :: ",jsonObject);
        scannedBarcode = "";
      } else {
        try {
          str = str.replace(/'/g, '"').replace(/(\w+):/g, '"$1":');
          var jsonObject = JSON.parse(str);
          console.log("jsonObject2222::", jsonObject);
        } catch (e) {
          console.error("Parsing error:", e);
        }
        console.log("vision2");
        await processVision2(jsonObject);
        console.log("Vision2_JSONobject :: ",jsonObject);

        await welding(jsonObject);
        await fpcb(jsonObject);
        scannedBarcode = "";
      }
    }
  });

  // socket.on("end", () => {
  //   console.log("Client disconnected");
  // });
  
});


const PORT = 7080;

server.listen(PORT, () => {
  var scannedBarcode = "";
  console.log(`Server listening on port ${PORT}`);
  console.log("listenscanbarcode", scannedBarcode);
});

//********************* vision1 start ********************//
let previousRFID = null;

async function processVision1(data, scannedBarcode) {
  console.log("test vision111111111111111111", data, scannedBarcode);

  const RFID = data.vision1.RFID;
  const statusToStore = data.vision1.OKStatus ? "OK" : data.vision1.NOKStatus ? "NOT OK" : null;

  if (RFID && RFID !== previousRFID) {
    const mainPoolConnectResult = await mainPoolConnect;
    const mainPoolRequest = mainPoolConnectResult.request();

    const result = await mainPoolRequest.query(`SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    console.log("RFID Check");

    if (result.recordset.length > 0) {
      const mainPoolRequestUpdate = mainPoolConnectResult.request();
      await mainPoolRequestUpdate.query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET module_barcode = '${scannedBarcode}', v1_live_status = '1', date_time = GETDATE() WHERE RFID = '${RFID}'`);
      console.log("Data Updated in linking_module_RFID! & v1 live status is 1");
    } else {
      const mainPoolRequestInsert = mainPoolConnectResult.request();
      await mainPoolRequestInsert.query(`INSERT INTO [replus_treceability].[dbo].[linking_module_RFID] (RFID, module_barcode, v1_live_status) VALUES ('${RFID}', '${scannedBarcode}', '1')`);
      console.log("Data inserted in linking_module_RFID For Vision1!!");
    }

    // Get the date_time after the insert/update
    const result2 = await mainPoolConnectResult.request().query(`SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);

    const dbDate = result2.recordset[0].date_time;
    console.log("dbdate:::", dbDate);

    globalFormattedDateTime = formatDateTime(dbDate);
    console.log("Global Formatted DateTime:::", globalFormattedDateTime);

    previousRFID = RFID;
  }

  // Continuously check for OK Status or NOT OK Status
  let continueChecking = true;

  while (continueChecking) {
    // Retrieve the module_barcode from the linking_module_RFID table using RFID
    const mainPoolConnectResult = await mainPoolConnect;
    const barcodeResult = await mainPoolConnectResult.request().query(`SELECT module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);

    if (barcodeResult.recordset.length === 0) {
      console.log("No module barcode found for the given RFID For Vision1!");
      return;
    }

    const moduleBarcode = barcodeResult.recordset[0].module_barcode;

    if (statusToStore) {
      const v1error = data.vision1.ERRORStatus;
      const queryString = `SELECT * FROM [replus_treceability].[dbo].[cell_sorting_backup] WHERE ModuleCode = '${moduleBarcode}'`;
      console.log("queryString ::", queryString);

      const mainPoolConnectResult2 = await mainPoolConnect;
      const secondResult = await mainPoolConnectResult2.request().query(queryString);
      console.log("secondResult ::", secondResult.recordset.length);

      if (secondResult.recordset.length > 0) {
        const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${moduleBarcode}'`;
        const selectResult = await mainPoolConnectResult.request().query(selectQuery);

        if (selectResult.recordset.length > 0) {
          // Update the existing record
          await mainPoolConnectResult.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET battery_pack_name = '${secondResult.recordset[0].battery_pack_name}', v1_status = '${statusToStore}', v1_error = '${v1error}' WHERE module_barcode = '${moduleBarcode}'`);
          console.log("Data updated successfully in clw_station_status!");
          continueChecking = false; // Stop checking after successful update

        } 
        else {
          // Insert a new record
          await mainPoolConnectResult.request().query(`INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, battery_pack_name, v1_status, v1_error, v1_start_date) VALUES ('${moduleBarcode}', '${secondResult.recordset[0].battery_pack_name}', '${statusToStore}', '${v1error}', '${globalFormattedDateTime}')`);
          console.log("Data inserted successfully in clw_station_status!");

          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0' WHERE module_barcode = '${moduleBarcode}'`);
          console.log("vision1queryyy:::", `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v1_live_status = '0'`);

       
          /******************** indrajeet code start **************************/
          const combinedResult1 = await mainPool.request().query(`
          WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${moduleBarcode}' ORDER BY sr_no DESC)
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
              await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v1_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${moduleBarcode}'`);
            } else {
              console.log(`No previous record found for module_barcode: ${moduleBarcode}`);
            }
            
  /******************** Code to send NOT OK Status in rework table ****************************/
  if (statusToStore === 'NOT OK') {
    await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station) VALUES ('${moduleBarcode}', 'Vision 1')`);
    console.log("Data inserted into replus_NOTOK_history_details for Vision 1");
  }

          } else {
            console.log(`No previous record found for module_barcode: ${moduleBarcode}`);
          }
          continueChecking = false; // Stop checking after successful insertion
        }
      }
    }
    // Optional: Add a delay between checks if you want to avoid rapid looping
    await new Promise((resolve) => setTimeout(resolve, 1000)); 
  }
}

/******************** indrajeet code end ****************************/

//********************* vision1 end **********************//


//******************** vision2 start *********************//
let previousRFIDv2 = null;
let previousStatus = null; // Initialize previousStatus globally

async function processVision2(data) {
  var curdate = new Date();
  var yr = curdate.getFullYear();
  var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  var day = ("0" + curdate.getDate()).slice(-2);
  var today_date = yr + "-" + month + "-" + day + " " + curdate.getHours() + ":" + curdate.getMinutes() + ":" + curdate.getSeconds();
  console.log("date", today_date);
  console.log("processVision2::::", data);

  let continueChecking = true;

  const RFID = data.vision2.RFID;

  if (RFID && RFID !== previousRFIDv2) {
    const mainPool = await sql.connect(mainDBConfig);

    // Check if RFID exists in the linking_module_RFID table
    const checkResult = await mainPool.request().query(`SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    console.log("RFID Check result::", checkResult);

    if (checkResult.recordset.length > 0) {
      // Update date_time & live status in the linking_module_RFID table if RFID exists
      await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v2_live_status = '1', date_time = GETDATE() WHERE RFID = '${RFID}'`);
      console.log("RFID date_time updated in linking_module_RFID table for vision 2!");
    }

    previousRFIDv2 = RFID; // Update previousRFIDv2 to the current RFID
  }

  if (continueChecking) {
    console.log("Checking status::", data.vision2.OKStatus, data.vision2.NOKStatus,);
    if (data.vision2.OKStatus || data.vision2.NOKStatus) {
      console.log("Status detected");
      const v2_status = data.vision2.OKStatus ? "OK" : "NOT OK";
      const v2_error = data.vision2.ERRORStatus;

      if (v2_status !== previousStatus) {
        const mainPool = await sql.connect(mainDBConfig);

        // Retrieve the module_barcode and start_date from the linking_module_RFID table using RFID
        const barcodeResult = await mainPool.request().query(`SELECT module_barcode, date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);

        if (barcodeResult.recordset.length === 0) {
          console.log("No module barcode found for the given RFID For Vision2!");
          return;
        }

        const { module_barcode, date_time: start_date } =  barcodeResult.recordset[0];
        const globalFormattedDateTime = formatDateTime(start_date);

        // Update the clw_station_status table
        const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}'`;
        const selectResult = await mainPool.request().query(selectQuery);

        if (selectResult.recordset.length > 0) {
          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = '${v2_status}', v2_error = '${v2_error}', v2_start_date = '${globalFormattedDateTime}', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`);
          console.log("Data updated successfully in clw_station_status");
          
          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v2_live_status = '0'`);
          console.log("v2LIVESTATUS:::", `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET v2_live_status = '0'`);

        
          previousStatus = v2_status; // Update previousStatus to the current status
          continueChecking = false;   // Stop checking after successful update

          /******************** indrajeet code start ****************************/
          const combinedResult2 = await mainPool.request().query(`
          WITH LatestRow AS ( SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}'  ORDER BY sr_no DESC)
          SELECT TOP 1 v2_end_date FROM [dbo].[clw_station_status] WHERE  sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, v2_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

          let previous_v2_end_date = null;
          if (combinedResult2.recordset.length > 0) {
            previous_v2_end_date = combinedResult2.recordset[0].v2_end_date;
          }
          console.log("vision 2 datee", previous_v2_end_date);

          if (previous_v2_end_date != null) {
            globalFormattedDateTime1 = formatDateTime(previous_v2_end_date);

            console.log("globalFormattedDateTime1::", globalFormattedDateTime1);

            if (globalFormattedDateTime1) {
              await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v2_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${module_barcode}'`);
            } else {
              console.log(`No previous record found for module_barcode: ${module_barcode}`);
            }
          } else {
            console.log(`No previous record found for module_barcode: ${module_barcode}`);
          }

  /******************** Code to send NOT OK Status in rework table ****************************/
  if (v2_status === 'NOT OK') {
    await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station) VALUES ('${module_barcode}', 'Vision 2')`);
    console.log("Data inserted into replus_NOTOK_history_details for Vision 2");
  }

        } else {
          console.log(`No record found in clw_station_status for module_barcode: ${module_barcode}`);
          continueChecking = false; // Stop checking if no record to update
        }
      }
      /******************** indrajeet code end ****************************/

    } else {
      console.log("Waiting for OKStatus or NOKStatus...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    }
  }
}
//******************** vision2 end *********************//


//******************* Welding start ********************//
let previousRFIDwel = null;
let previousWeldingStatus = null;

async function welding(data) {
  var curdate = new Date();
  var yr = curdate.getFullYear();
  var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  var day = ("0" + curdate.getDate()).slice(-2);
  var today_date = yr + "-" + month + "-" + day + " " + curdate.getHours() + ":" + curdate.getMinutes() + ":" + curdate.getSeconds();
  console.log("date", today_date);
  console.log("welding::::", data);

  let continueChecking = true;

  const RFID = data.welding.RFID;

  if (RFID && RFID !== previousRFIDwel) {
    const mainPool = await sql.connect(mainDBConfig);

    // Check if RFID exists in the linking_module_RFID table
    const checkResult = await mainPool.request().query(`SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    console.log("RFID Check result::", checkResult);

    if (checkResult.recordset.length > 0) {
      // Update date_time in the linking_module_RFID table if RFID exists
      await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET welding_live_status = '1', date_time = GETDATE() WHERE RFID = '${RFID}'`);
      console.log("weldingggg RFID date_time updated in linking_module_RFID table");
    }

    previousRFIDwel = RFID; // Update previousRFIDwel to the current RFID
  }

  if (continueChecking) {
    console.log("Welding_status ::", data.welding.OKStatus, data.welding.NOKStatus);
    if (data.welding.OKStatus || data.welding.NOKStatus) {
      // console.log("2222222222222");
      const welding_status = data.welding.OKStatus ? "OK" : "NOT OK";
      const welding_error = data.welding.ERRORStatus;

      if (welding_status !== previousWeldingStatus) {
        const mainPool = await sql.connect(mainDBConfig);

        // Retrieve the module_barcode and start_date from the linking_module_RFID table using RFID
        const barcodeResult = await mainPool.request().query(`SELECT module_barcode, date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);

        if (barcodeResult.recordset.length === 0) {
          console.log("No module barcode found for the given RFID for welding");
          return;
        }

        const { module_barcode, date_time: start_date } = barcodeResult.recordset[0];
        const globalFormattedDateTime = formatDateTime(start_date);

        // Update the clw_station_status table
        const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}'`;
        const selectResult = await mainPool.request().query(selectQuery);

        if (selectResult.recordset.length > 0) {
          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = '${welding_status}', welding_error = '${welding_error}', welding_start_date = '${globalFormattedDateTime}', welding_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`);
          console.log("Data updated successfully in clw_station_status");
          
          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET welding_live_status = '0'`);
          console.log("weldingqueryyy:::", `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET welding_live_status = '0'`);

          previousWeldingStatus = welding_status; // Update previousWeldingStatus to the current status
          continueChecking = false; // Stop checking after successful update

          /******************** indrajeet code start ****************************/
          const combinedResult3 = await mainPool.request().query(`
            WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}' ORDER BY sr_no DESC)
            SELECT TOP 1 welding_end_date FROM [dbo].[clw_station_status] WHERE sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, welding_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

          let previous_welding_end_date = null;
          if (combinedResult3.recordset.length > 0) {
            previous_welding_end_date =
              combinedResult3.recordset[0].welding_end_date;
          }
          console.log("welding dateeeeeeeeeeeeeee", previous_welding_end_date);

          if (previous_welding_end_date != null) {
            globalFormattedDateTime1 = formatDateTime(previous_welding_end_date,);

            console.log("weldingggg", globalFormattedDateTime1);

            if (globalFormattedDateTime1) {
              await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  welding_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${module_barcode}'`);
            } else {
              console.log(`No previous welding record found for module_barcode: ${module_barcode}`);
            }
          } else {
            console.log(`No previous welding record found for module_barcode: ${module_barcode}`);
          }

          /******************** Code to send NOT OK Status in rework table ****************************/
          if (welding_status === 'NOT OK') {
            await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station) VALUES ('${module_barcode}', 'Welding')`);
            console.log("Data inserted into replus_NOTOK_history_details for Welding");
          }

        } else {
          console.log(`No record found in clw_station_status for module_barcode: ${module_barcode}`);
          continueChecking = false; // Stop checking if no record to update
        }
      }
      /******************** indrajeet code end ****************************/

    } else {
      console.log("Waiting for OKStatus or NOKStatus...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    }
  }
}
//******************** Welding end *********************//


//******************** FPCB start **********************//
let previousRFIDfpcb = null;
let previousFPCBStatus = null;

async function fpcb(data) {
  var curdate = new Date();
  var yr = curdate.getFullYear();
  var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
  var day = ("0" + curdate.getDate()).slice(-2);
  var today_date = yr + "-" + month + "-" + day + " " + curdate.getHours() + ":" + curdate.getMinutes() + ":" + curdate.getSeconds();
  console.log("date", today_date);
  console.log("fpcb::::", data);

  let continueChecking = true;

  const RFID = data.fpcb.RFID;

  if (RFID && RFID !== previousRFIDfpcb) {
    const mainPool = await sql.connect(mainDBConfig);

    // Check if RFID exists in the linking_module_RFID table
    const checkResult = await mainPool.request().query(`SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);
    console.log("RFID Check result::", checkResult);

    if (checkResult.recordset.length > 0) {
      // Update date_time in the linking_module_RFID table if RFID exists
      await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = '1', date_time = GETDATE() WHERE RFID = '${RFID}'`);
      console.log("fpcbbbbbb RFID date_time updated in linking_module_RFID table");
    }

    previousRFIDfpcb = RFID; // Update previousRFIDfpcb to the current RFID
  }

  if (continueChecking) {
    console.log("1111111::", data.fpcb.OKStatus, data.fpcb.NOKStatus);
    if (data.fpcb.OKStatus || data.fpcb.NOKStatus) {
      console.log("2222222222222");
      const fpcb_status = data.fpcb.OKStatus ? "OK" : "NOT OK";
      const fpcb_error = data.fpcb.ERRORStatus;

      if (fpcb_status !== previousFPCBStatus) {
        const mainPool = await sql.connect(mainDBConfig);

        // Retrieve the module_barcode and start_date from the linking_module_RFID table using RFID
        const barcodeResult = await mainPool.request().query(`SELECT module_barcode, date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`);

        if (barcodeResult.recordset.length === 0) {
          console.log("No module barcode found for the given RFID fpcb");
          return;
        }

        const { module_barcode, date_time: start_date } = barcodeResult.recordset[0];
        const globalFormattedDateTime = formatDateTime(start_date);

        // Update the clw_station_status table
        const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}'`;
        const selectResult = await mainPool.request().query(selectQuery);

        if (selectResult.recordset.length > 0) {
          // Update the existing record
          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = '${fpcb_status}', fpcb_error = '${fpcb_error}', fpcb_start_date = '${globalFormattedDateTime}', fpcb_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`);
          console.log("fpcbqueryyy:::", `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = '${fpcb_status}', fpcb_error = '${fpcb_error}', fpcb_start_date = '${globalFormattedDateTime}', fpcb_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`);
          console.log("Data updated successfully in clw_station_status for FPCB!!");

          previousFPCBStatus = fpcb_status; // Update previousFPCBStatus to the current status
          continueChecking = false; // Stop checking after successful update

          await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = '0' WHERE module_barcode = '${module_barcode}'`);
          console.log("fpcb_live_status_update_query:::", `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET fpcb_live_status = '0' WHERE module_barcode = '${module_barcode}'`);

          /******************** indrajeet code start ****************************/
          const combinedResult4 = await mainPool.request().query(`
          WITH LatestRow AS (SELECT TOP 1 sr_no FROM [dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}' ORDER BY sr_no DESC)
          SELECT TOP 1 fpcb_end_date FROM [dbo].[clw_station_status] WHERE sr_no < (SELECT sr_no FROM LatestRow) AND CONVERT(date, fpcb_end_date) = CONVERT(date, GETDATE()) ORDER BY sr_no DESC`);

          let previous_fpcb_end_date = null;
          if (combinedResult4.recordset.length > 0) {
            previous_fpcb_end_date = combinedResult4.recordset[0].fpcb_end_date;
          }
          console.log("fpcb dateee", previous_fpcb_end_date);

          if (previous_fpcb_end_date != null) {
            globalFormattedDateTime1 = formatDateTime(previous_fpcb_end_date);

            console.log("fpcbbbbb", globalFormattedDateTime1);

            if (globalFormattedDateTime1) {
              await mainPool.request().query(`UPDATE [replus_treceability].[dbo].[clw_station_status] SET  fpcb_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${module_barcode}'`);
            } else {
              console.log(`No previous fpcb record found for module_barcode: ${module_barcode}`);
            }
          } else {
            console.log(`No previous fpcb record found for module_barcode: ${module_barcode}`);
          }
        } else {
          console.log(`No record found in clw_station_status for module_barcode: ${module_barcode}`);
          continueChecking = false; // Stop checking if no record to update
        }
         /******************** Code to send NOT OK Status in rework table ****************************/
  if (fpcb_status === 'NOT OK') {
    await mainPool.request().query(`INSERT INTO [replus_treceability].[dbo].[replus_NOTOK_history_details] (module_barcode, station) VALUES ('${module_barcode}', 'fpcb')`);
    console.log("Data inserted into replus_NOTOK_history_details for FPCB");
  }
      }
     
    } else {
      console.log("Waiting for OKStatus or NOKStatus...");
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
    }
  }
}
/******************** indrajeet code end ****************************/

//********************* FPCB end ***********************//











// **************************************************** OG ***********************************************************//
// const net = require("net");
// const sql = require("mssql");

// const mainDBConfig = {
//   user: "admin2",
//   password: "reset@123",
//   server: "REP-TRACE",
//   database: "replus_treceability",
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//   },
// };
// console.log("Connected to", mainDBConfig);

// // const mainDBConfig2 = {
// //   user: 'ReplusUser',
// //   password: 'ReplusPwd',
// //   //server: 'DESKTOP-EDK3VMS\\SQLEXPRESS',
// //   server: 'DESKTOP-PQOG0FT\\SQLEXPRESS',
// //   database: 'REPLUSBATTDB_V0100',
// //   options: {
// //     encrypt: false,
// //     trustServerCertificate: true,
// //   },
// // };
// // console.log("Connected to", mainDBConfig2);

// // Create a SQL connection pool for mainDBConfig
// const mainPool = new sql.ConnectionPool(mainDBConfig);
// const mainPoolConnect = mainPool.connect();

// // Create a SQL connection pool for mainDBConfig2
// // const mainPool2 = new sql.ConnectionPool(mainDBConfig2);
// // const mainPoolConnect2 = mainPool2.connect();

// console.log("Connected to", mainDBConfig);
// // console.log("Connected to", mainDBConfig2);

// /////////////start_date///////////
// let globalFormattedDateTime;

// // Helper function to format date and time
// function formatDateTime(dateTime) {
//   const dateObj = new Date(dateTime);
//   const datePart = dateObj.toISOString().split("T")[0];
//   const timePart = dateObj.toISOString().split("T")[1].split(".")[0];
//   return `${datePart} ${timePart}`;
// }
// //////start_date///////////

// var curdate = new Date();
// var yr = curdate.getFullYear();
// var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
// var day = ("0" + curdate.getDate()).slice(-2);
// var today_date =
//   yr +
//   "-" +
//   month +
//   "-" +
//   day +
//   " " +
//   curdate.getHours() +
//   ":" +
//   curdate.getMinutes() +
//   ":" +
//   curdate.getSeconds();
// console.log("date", today_date);

// var scannedBarcode = "";
// const server = net.createServer((socket) => {
//   //  console.log("Client connected",socket);

//   socket.on("data", async (data) => {
//     //  console.log("scannedBarcode....1::", scannedBarcode);
//     console.log("Data::", data);
//     var str = data.toString();
//     var checker = str.split(/-(.+)/);
//     if (checker[0] == "mcode") {
//       console.log("barcode::::", scannedBarcode);
//       scannedBarcode = checker[1];
//     } else {
//       if (scannedBarcode.length > 0) {
//         console.log("444444444444444", scannedBarcode);
//         //console.log("data", data);
//         str = str.replace(/'/g, '"');
//         // Add double quotes around keys using a regular expression
//         str = str.replace(/(\w+):/g, '"$1":');

//         try {
//           var jsonObject = JSON.parse(str);
//           console.log("jsonObject::", jsonObject);
//         } catch (e) {
//           console.error("Parsing error:", e);
//         }
//         console.log("vision11111111", scannedBarcode);
//         await processVision1(jsonObject, scannedBarcode);
//         scannedBarcode = "";
//         // await processVision2(jsonObject, scannedBarcode);
//         // await welding(jsonObject, scannedBarcode);
//         // await fpcb(jsonObject, scannedBarcode);
//       } else {
//         // console.log("5555555555555",scannedBarcode);
//         try {
//           // console.log("str:",str);
//           str = str.replace(/'/g, '"');
//           // Add double quotes around keys using a regular expression
//           str = str.replace(/(\w+):/g, '"$1":');
//           var jsonObject = JSON.parse(str);
//           console.log("jsonObject::", jsonObject);
//         } catch (e) {
//           console.error("Parsing error:", e);
//         }
//         console.log("vision2");

//         await processVision2(jsonObject);
//         await welding(jsonObject);
//         await fpcb(jsonObject);
//         scannedBarcode = "";
//         // console.log("read mqr code first");
//       }
//     }
//   });

//   socket.on("end", () => {
//     console.log("Client disconnected");
//   });
// });

// const PORT = 7080;

// server.listen(PORT, () => {
//   var scannedBarcode = "";

//   console.log(`Server listening on port ${PORT}`);
//   console.log("listenscanbarcode", scannedBarcode);
// });

// //*********************vision1 start************
// let previousRFID = null;
// async function processVision1(data, scannedBarcode) {
//   console.log("test vision111111111111111111", data, scannedBarcode);

//   const RFID = data.vision1.RFID;
//   const statusToStore = data.vision1.OKStatus
//     ? "OK"
//     : data.vision1.NOKStatus
//       ? "NOT OK"
//       : null;

//   if (RFID && RFID !== previousRFID) {
//     const mainPoolConnectResult = await mainPoolConnect;
//     const mainPoolRequest = mainPoolConnectResult.request();
//     const result = await mainPoolRequest.query(
//       `SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//     );
//     console.log("RFID Check");

//     if (result.recordset.length > 0) {
//       const mainPoolRequestUpdate = mainPoolConnectResult.request();
//       await mainPoolRequestUpdate.query(
//         `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET module_barcode = '${scannedBarcode}', date_time = GETDATE() WHERE RFID = '${RFID}'`,
//       );
//       console.log("Data Updated");
//     } else {
//       const mainPoolRequestInsert = mainPoolConnectResult.request();
//       await mainPoolRequestInsert.query(
//         `INSERT INTO [replus_treceability].[dbo].[linking_module_RFID] (RFID, module_barcode) VALUES ('${RFID}', '${scannedBarcode}')`,
//       );
//       console.log("Data inserted");
//     }

//     // Get the date_time after the insert/update
//     const result2 = await mainPoolConnectResult
//       .request()
//       .query(
//         `SELECT date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//       );

//     const dbDate = result2.recordset[0].date_time;
//     console.log("dbdate:::", dbDate);

//     globalFormattedDateTime = formatDateTime(dbDate);
//     console.log("Global Formatted DateTime:::", globalFormattedDateTime);

//     previousRFID = RFID;
//   }

//   // Continuously check for OKStatus or NOKStatus
//   let continueChecking = true;
//   while (continueChecking) {
//     // Retrieve the module_barcode from the linking_module_RFID table using RFID
//     const mainPoolConnectResult = await mainPoolConnect;
//     const barcodeResult = await mainPoolConnectResult
//       .request()
//       .query(
//         `SELECT module_barcode FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//       );

//     if (barcodeResult.recordset.length === 0) {
//       console.log("No module barcode found for the given RFID");
//       return;
//     }

//     const moduleBarcode = barcodeResult.recordset[0].module_barcode;

//     if (statusToStore) {
//       const v1error = data.vision1.ERRORStatus;

//       const queryString = `SELECT *  FROM [replus_treceability].[dbo].[cell_sorting_backup] WHERE ModuleCode = '${moduleBarcode}'`;

//       const mainPoolConnectResult2 = await mainPoolConnect;
//       const secondResult = await mainPoolConnectResult2
//         .request()
//         .query(queryString);
//       console.log("query111111111111111111111111111111111:", queryString);
//       console.log("yyyyyyyyyyyyyyyy:", secondResult.recordset.length);

//       if (secondResult.recordset.length > 0) {
//         const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${moduleBarcode}'`;
//         const selectResult = await mainPoolConnectResult
//           .request()
//           .query(selectQuery);

//         if (selectResult.recordset.length > 0) {
//           // Update the existing record
//           await mainPoolConnectResult
//             .request()
//             .query(
//               `UPDATE [replus_treceability].[dbo].[clw_station_status] SET battery_pack_name = '${secondResult.recordset[0].battery_pack_name}', v1_status = '${statusToStore}', v1_error = '${v1error}' WHERE module_barcode = '${moduleBarcode}'`,
//             );
//           console.log("Data updated successfullyyyyyyyyyyyyyyyyyyyyy");
//           continueChecking = false; // Stop checking after successful update
//         } else {
//           // Insert a new record
//           await mainPoolConnectResult
//             .request()
//             .query(
//               `INSERT INTO [replus_treceability].[dbo].[clw_station_status] (module_barcode, battery_pack_name, v1_status, v1_error, v1_start_date) VALUES ('${moduleBarcode}', '${secondResult.recordset[0].battery_pack_name}', '${statusToStore}', '${v1error}', '${globalFormattedDateTime}')`,
//             );
//           console.log("Data inserted successfullyyyyyyyyyyyyyyyyyyyyy");

//           const combinedResult1 = await mainPool.request().query(`
//                 WITH LatestRow AS (
//                     SELECT TOP 1 sr_no
//                     FROM [dbo].[clw_station_status]
//                     WHERE module_barcode = '${moduleBarcode}'
//                     ORDER BY sr_no DESC
//                 )
//                 SELECT TOP 1 v1_end_date
//                 FROM [dbo].[clw_station_status]
//                 WHERE  sr_no < (SELECT sr_no FROM LatestRow)
//                  AND CONVERT(date, v1_end_date) = CONVERT(date, GETDATE())
//                 ORDER BY sr_no DESC;
//             `);

//           let previous_v1_end_date = null;
//           if (combinedResult1.recordset.length > 0) {
//             previous_v1_end_date = combinedResult1.recordset[0].v1_end_date;
//           }
//           console.log("vision 1 dateeeeeeeeeeeeeee", previous_v1_end_date);

//           if (previous_v1_end_date != null) {
//             globalFormattedDateTime1 = formatDateTime(previous_v1_end_date);

//             console.log("jjjjjjjjjj", globalFormattedDateTime1);

//             if (globalFormattedDateTime1) {
//               await mainPool
//                 .request()
//                 .query(
//                   `UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v1_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${moduleBarcode}'`,
//                 );
//             } else {
//               console.log(
//                 `No previous record found for module_barcode: ${moduleBarcode}`,
//               );
//             }
//           } else {
//             console.log(
//               `No previous record found for module_barcode: ${moduleBarcode}`,
//             );
//           }
//           continueChecking = false; // Stop checking after successful insertion
//         }
//       }
//     }
//     // Optional: Add a delay between checks if you want to avoid rapid looping
//     await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second delay
//   }
// }
// //*********************vision1 end************

// //***********vision 2 start********
// let previousRFIDv2 = null;
// let previousStatus = null; // Initialize previousStatus globally
// async function processVision2(data) {
//   var curdate = new Date();
//   var yr = curdate.getFullYear();
//   var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
//   var day = ("0" + curdate.getDate()).slice(-2);
//   var today_date =
//     yr +
//     "-" +
//     month +
//     "-" +
//     day +
//     " " +
//     curdate.getHours() +
//     ":" +
//     curdate.getMinutes() +
//     ":" +
//     curdate.getSeconds();
//   console.log("date", today_date);
//   console.log("processVision2::::", data);

//   let continueChecking = true;

//   const RFID = data.vision2.RFID;

//   if (RFID && RFID !== previousRFIDv2) {
//     const mainPool = await sql.connect(mainDBConfig);

//     // Check if RFID exists in the linking_module_RFID table
//     const checkResult = await mainPool
//       .request()
//       .query(
//         `SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//       );
//     console.log("RFID Check result::", checkResult);

//     if (checkResult.recordset.length > 0) {
//       // Update date_time in the linking_module_RFID table if RFID exists
//       await mainPool
//         .request()
//         .query(
//           `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET date_time = GETDATE() WHERE RFID = '${RFID}'`,
//         );
//       console.log("RFID date_time updated in linking_module_RFID table");
//     }

//     previousRFIDv2 = RFID; // Update previousRFIDv2 to the current RFID
//   }

//   if (continueChecking) {
//     console.log(
//       "Checking status::",
//       data.vision2.OKStatus,
//       data.vision2.NOKStatus,
//     );
//     if (data.vision2.OKStatus || data.vision2.NOKStatus) {
//       console.log("Status detected");
//       const v2_status = data.vision2.OKStatus ? "OK" : "NOT OK";
//       const v2_error = data.vision2.ERRORStatus;

//       if (v2_status !== previousStatus) {
//         const mainPool = await sql.connect(mainDBConfig);

//         // Retrieve the module_barcode and start_date from the linking_module_RFID table using RFID
//         const barcodeResult = await mainPool
//           .request()
//           .query(
//             `SELECT module_barcode, date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//           );

//         if (barcodeResult.recordset.length === 0) {
//           console.log("No module barcode found for the given RFID");
//           return;
//         }

//         const { module_barcode, date_time: start_date } =
//           barcodeResult.recordset[0];
//         const globalFormattedDateTime = formatDateTime(start_date);

//         // Update the clw_station_status table
//         const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}'`;
//         const selectResult = await mainPool.request().query(selectQuery);

//         if (selectResult.recordset.length > 0) {
//           await mainPool
//             .request()
//             .query(
//               `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = '${v2_status}', v2_error = '${v2_error}', v2_start_date = '${globalFormattedDateTime}', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`,
//             );
//           console.log("Data updated successfully in clw_station_status");
//           console.log(
//             "v2query:::",
//             `UPDATE [replus_treceability].[dbo].[clw_station_status] SET v2_status = '${v2_status}', v2_error = '${v2_error}', v2_start_date = '${globalFormattedDateTime}', v2_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`,
//           );
//           previousStatus = v2_status; // Update previousStatus to the current status
//           continueChecking = false;
//           // Stop checking after successful update

//           const combinedResult2 = await mainPool.request().query(`
//                 WITH LatestRow AS (
//                     SELECT TOP 1 sr_no
//                     FROM [dbo].[clw_station_status]
//                     WHERE module_barcode = '${module_barcode}'
//                     ORDER BY sr_no DESC
//                 )
//                 SELECT TOP 1 v2_end_date
//                 FROM [dbo].[clw_station_status]
//                 WHERE 
//               sr_no < (SELECT sr_no FROM LatestRow)
//                AND CONVERT(date, v2_end_date) = CONVERT(date, GETDATE())
//                 ORDER BY sr_no DESC;
//             `);

//           let previous_v2_end_date = null;
//           if (combinedResult2.recordset.length > 0) {
//             previous_v2_end_date = combinedResult2.recordset[0].v2_end_date;
//           }
//           console.log("vision 2 dateeeeeeeeeeeeeee", previous_v2_end_date);

//           if (previous_v2_end_date != null) {
//             globalFormattedDateTime1 = formatDateTime(previous_v2_end_date);

//             console.log("jjjjjjjjjj", globalFormattedDateTime1);

//             if (globalFormattedDateTime1) {
//               await mainPool
//                 .request()
//                 .query(
//                   `UPDATE [replus_treceability].[dbo].[clw_station_status] SET  v2_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${module_barcode}'`,
//                 );
//             } else {
//               console.log(
//                 `No previous record found for module_barcode: ${module_barcode}`,
//               );
//             }
//           } else {
//             console.log(
//               `No previous record found for module_barcode: ${module_barcode}`,
//             );
//           }
//         } else {
//           console.log(
//             `No record found in clw_station_status for module_barcode: ${module_barcode}`,
//           );
//           continueChecking = false; // Stop checking if no record to update
//         }
//       }
//     } else {
//       console.log("Waiting for OKStatus or NOKStatus...");
//       await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
//     }
//   }
// }
// //***********vision 2 start********

// //   ***********welding start***********
// let previousRFIDwel = null;
// let previousWeldingStatus = null;

// async function welding(data) {
//   var curdate = new Date();
//   var yr = curdate.getFullYear();
//   var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
//   var day = ("0" + curdate.getDate()).slice(-2);
//   var today_date =
//     yr +
//     "-" +
//     month +
//     "-" +
//     day +
//     " " +
//     curdate.getHours() +
//     ":" +
//     curdate.getMinutes() +
//     ":" +
//     curdate.getSeconds();
//   console.log("date", today_date);
//   console.log("welding::::", data);

//   let continueChecking = true;

//   const RFID = data.welding.RFID;

//   if (RFID && RFID !== previousRFIDwel) {
//     const mainPool = await sql.connect(mainDBConfig);

//     // Check if RFID exists in the linking_module_RFID table
//     const checkResult = await mainPool
//       .request()
//       .query(
//         `SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//       );
//     console.log("RFID Check result::", checkResult);

//     if (checkResult.recordset.length > 0) {
//       // Update date_time in the linking_module_RFID table if RFID exists
//       await mainPool
//         .request()
//         .query(
//           `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET date_time = GETDATE() WHERE RFID = '${RFID}'`,
//         );
//       console.log(
//         "weldingggg RFID date_time updated in linking_module_RFID table",
//       );
//     }

//     previousRFIDwel = RFID; // Update previousRFIDwel to the current RFID
//   }

//   if (continueChecking) {
//     console.log("1111111::", data.welding.OKStatus, data.welding.NOKStatus);
//     if (data.welding.OKStatus || data.welding.NOKStatus) {
//       console.log("2222222222222");
//       const welding_status = data.welding.OKStatus ? "OK" : "NOT OK";
//       const welding_error = data.welding.ERRORStatus;

//       if (welding_status !== previousWeldingStatus) {
//         const mainPool = await sql.connect(mainDBConfig);

//         // Retrieve the module_barcode and start_date from the linking_module_RFID table using RFID
//         const barcodeResult = await mainPool
//           .request()
//           .query(
//             `SELECT module_barcode, date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//           );

//         if (barcodeResult.recordset.length === 0) {
//           console.log("No module barcode found for the given RFID");
//           return;
//         }

//         const { module_barcode, date_time: start_date } =
//           barcodeResult.recordset[0];
//         const globalFormattedDateTime = formatDateTime(start_date);

//         // Update the clw_station_status table
//         const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}'`;
//         const selectResult = await mainPool.request().query(selectQuery);

//         if (selectResult.recordset.length > 0) {
//           await mainPool
//             .request()
//             .query(
//               `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = '${welding_status}', welding_error = '${welding_error}', welding_start_date = '${globalFormattedDateTime}', welding_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`,
//             );
//           console.log("Data updated successfully in clw_station_status");
//           console.log(
//             "weldingqueryyy:::",
//             `UPDATE [replus_treceability].[dbo].[clw_station_status] SET welding_status = '${welding_status}', welding_error = '${welding_error}', welding_start_date = '${globalFormattedDateTime}', welding_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`,
//           );
//           previousWeldingStatus = welding_status; // Update previousWeldingStatus to the current status
//           continueChecking = false; // Stop checking after successful update

//           const combinedResult3 = await mainPool.request().query(`
//             WITH LatestRow AS (
//                 SELECT TOP 1 sr_no
//                 FROM [dbo].[clw_station_status]
//                 WHERE module_barcode = '${module_barcode}'
//                 ORDER BY sr_no DESC
//             )
//             SELECT TOP 1 welding_end_date
//             FROM [dbo].[clw_station_status]
//             WHERE 
//           sr_no < (SELECT sr_no FROM LatestRow)
//            AND CONVERT(date, welding_end_date) = CONVERT(date, GETDATE())
//             ORDER BY sr_no DESC;
//         `);

//           let previous_welding_end_date = null;
//           if (combinedResult3.recordset.length > 0) {
//             previous_welding_end_date =
//               combinedResult3.recordset[0].welding_end_date;
//           }
//           console.log("welding dateeeeeeeeeeeeeee", previous_welding_end_date);

//           if (previous_welding_end_date != null) {
//             globalFormattedDateTime1 = formatDateTime(
//               previous_welding_end_date,
//             );

//             console.log("weldingggg", globalFormattedDateTime1);

//             if (globalFormattedDateTime1) {
//               await mainPool
//                 .request()
//                 .query(
//                   `UPDATE [replus_treceability].[dbo].[clw_station_status] SET  welding_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${module_barcode}'`,
//                 );
//             } else {
//               console.log(
//                 `No previous welding record found for module_barcode: ${module_barcode}`,
//               );
//             }
//           } else {
//             console.log(
//               `No previous welding record found for module_barcode: ${module_barcode}`,
//             );
//           }
//         } else {
//           console.log(
//             `No record found in clw_station_status for module_barcode: ${module_barcode}`,
//           );
//           continueChecking = false; // Stop checking if no record to update
//         }
//       }
//     } else {
//       console.log("Waiting for OKStatus or NOKStatus...");
//       await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
//     }
//   }
// }
// //   ***********welding start***********

// // **********fpcb start***********
// let previousRFIDfpcb = null;
// let previousFPCBStatus = null;

// async function fpcb(data) {
//   var curdate = new Date();
//   var yr = curdate.getFullYear();
//   var month = ("0" + (curdate.getMonth() + 1)).slice(-2);
//   var day = ("0" + curdate.getDate()).slice(-2);
//   var today_date =
//     yr +
//     "-" +
//     month +
//     "-" +
//     day +
//     " " +
//     curdate.getHours() +
//     ":" +
//     curdate.getMinutes() +
//     ":" +
//     curdate.getSeconds();
//   console.log("date", today_date);
//   console.log("fpcb::::", data);

//   let continueChecking = true;

//   const RFID = data.fpcb.RFID;

//   if (RFID && RFID !== previousRFIDfpcb) {
//     const mainPool = await sql.connect(mainDBConfig);

//     // Check if RFID exists in the linking_module_RFID table
//     const checkResult = await mainPool
//       .request()
//       .query(
//         `SELECT * FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//       );
//     console.log("RFID Check result::", checkResult);

//     if (checkResult.recordset.length > 0) {
//       // Update date_time in the linking_module_RFID table if RFID exists
//       await mainPool
//         .request()
//         .query(
//           `UPDATE [replus_treceability].[dbo].[linking_module_RFID] SET date_time = GETDATE() WHERE RFID = '${RFID}'`,
//         );
//       console.log(
//         "fpcbbbbbb RFID date_time updated in linking_module_RFID table",
//       );
//     }

//     previousRFIDfpcb = RFID; // Update previousRFIDfpcb to the current RFID
//   }

//   if (continueChecking) {
//     console.log("1111111::", data.fpcb.OKStatus, data.fpcb.NOKStatus);
//     if (data.fpcb.OKStatus || data.fpcb.NOKStatus) {
//       console.log("2222222222222");
//       const fpcb_status = data.fpcb.OKStatus ? "OK" : "NOT OK";
//       const fpcb_error = data.fpcb.ERRORStatus;

//       if (fpcb_status !== previousFPCBStatus) {
//         const mainPool = await sql.connect(mainDBConfig);

//         // Retrieve the module_barcode and start_date from the linking_module_RFID table using RFID
//         const barcodeResult = await mainPool
//           .request()
//           .query(
//             `SELECT module_barcode, date_time FROM [replus_treceability].[dbo].[linking_module_RFID] WHERE RFID = '${RFID}'`,
//           );

//         if (barcodeResult.recordset.length === 0) {
//           console.log("No module barcode found for the given RFID");
//           return;
//         }

//         const { module_barcode, date_time: start_date } =
//           barcodeResult.recordset[0];
//         const globalFormattedDateTime = formatDateTime(start_date);

//         // Update the clw_station_status table
//         const selectQuery = `SELECT * FROM [replus_treceability].[dbo].[clw_station_status] WHERE module_barcode = '${module_barcode}'`;
//         const selectResult = await mainPool.request().query(selectQuery);

//         if (selectResult.recordset.length > 0) {
//           // Update the existing record
//           await mainPool
//             .request()
//             .query(
//               `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = '${fpcb_status}', fpcb_error = '${fpcb_error}', fpcb_start_date = '${globalFormattedDateTime}', fpcb_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`,
//             );
//           console.log("Data updated successfully in clw_station_status");
//           console.log(
//             "fpcbqueryyy:::",
//             `UPDATE [replus_treceability].[dbo].[clw_station_status] SET fpcb_status = '${fpcb_status}', fpcb_error = '${fpcb_error}', fpcb_start_date = '${globalFormattedDateTime}', fpcb_end_date = '${today_date}' WHERE module_barcode = '${module_barcode}'`,
//           );
//           previousFPCBStatus = fpcb_status; // Update previousFPCBStatus to the current status
//           continueChecking = false; // Stop checking after successful update

//           const combinedResult4 = await mainPool.request().query(`
//             WITH LatestRow AS (
//                 SELECT TOP 1 sr_no
//                 FROM [dbo].[clw_station_status]
//                 WHERE module_barcode = '${module_barcode}'
//                 ORDER BY sr_no DESC
//             )
//             SELECT TOP 1 fpcb_end_date
//             FROM [dbo].[clw_station_status]
//             WHERE 
//           sr_no < (SELECT sr_no FROM LatestRow)
//              AND CONVERT(date, fpcb_end_date) = CONVERT(date, GETDATE())
//             ORDER BY sr_no DESC;
//         `);

//           let previous_fpcb_end_date = null;
//           if (combinedResult4.recordset.length > 0) {
//             previous_fpcb_end_date = combinedResult4.recordset[0].fpcb_end_date;
//           }
//           console.log("fpcb dateeeeeeeeeeeeeee", previous_fpcb_end_date);

//           if (previous_fpcb_end_date != null) {
//             globalFormattedDateTime1 = formatDateTime(previous_fpcb_end_date);

//             console.log("fpcbbbbb", globalFormattedDateTime1);

//             if (globalFormattedDateTime1) {
//               await mainPool
//                 .request()
//                 .query(
//                   `UPDATE [replus_treceability].[dbo].[clw_station_status] SET  fpcb_difference =  DATEDIFF(MINUTE, '${globalFormattedDateTime1}', '${globalFormattedDateTime}')  WHERE module_barcode = '${module_barcode}'`,
//                 );
//             } else {
//               console.log(
//                 `No previous fpcb record found for module_barcode: ${module_barcode}`,
//               );
//             }
//           } else {
//             console.log(
//               `No previous fpcb record found for module_barcode: ${module_barcode}`,
//             );
//           }
//         } else {
//           console.log(
//             `No record found in clw_station_status for module_barcode: ${module_barcode}`,
//           );
//           continueChecking = false; // Stop checking if no record to update
//         }
//       }
//     } else {
//       console.log("Waiting for OKStatus or NOKStatus...");
//       await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait for 1 second before checking again
//     }
//   }
// }
// // **********fpcb end***********
// **************************************************** OG ***********************************************************//
