// src/pages/api/clwmainlogic.js
import { ConnectionPool } from 'mssql';

// Declare today_date globally
const curdate = new Date();
const yr = curdate.getFullYear();
const month = ("0" + (curdate.getMonth() + 1)).slice(-2);
const day = ("0" + curdate.getDate()).slice(-2);
const today_date = yr + "-" + month + "-" + day + " " + curdate.getHours() + ":" + curdate.getMinutes() + ":" + curdate.getSeconds();


const mainDBConfig = {
    user: 'admin',
    password: 'admin',
    server: 'DESKTOP-FKJATC0',
    database: 'replus_treceability',
    options: {
        encrypt: false,
        trustServerCertificate: true,
    }
};

const moduleBarcode = "01TMB01810001BC7B700005555555";

async function fetchData() {
    // Simulate fetching data from an external source
    return {
        vision1: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: 'DA' },
        vision2: { OKStatus: true, NOKStatus: false, ERRORStatus: 0, RFID: '13' },
        welding: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '13' },
        fpcb: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '' }
    };
}


async function processVision1(data) {
    let statusToStore = null;

    if (data.vision1.OKStatus) {
        statusToStore = 'OK';
    } else if (data.vision1.NOKStatus) {
        statusToStore = 'NOK';
    }

    if (statusToStore) {
        const RFID = data.vision1.RFID;
        const v1error = data.vision1.ERRORStatus;

        const currentDate = new Date();
        const formattedDate = currentDate.toISOString();

        const mainPool = await new ConnectionPool(mainDBConfig).connect();
        const result = await mainPool.request()
            .query(`SELECT * FROM linking_module_RFID WHERE RFID = '${RFID}'`);

        if (result.recordset.length > 0) {
            await mainPool.request()
                .query(`UPDATE linking_module_RFID SET module_barcode = '${moduleBarcode}' WHERE RFID = '${RFID}'`);
                console.log('Data Updated');
        } else {
            await mainPool.request()
                .query(`INSERT INTO linking_module_RFID (RFID, module_barcode) VALUES ('${RFID}', '${moduleBarcode}')`);
                console.log('Data inserted');
        }

        const result2 = await mainPool.request()
            .query(`SELECT date_time FROM linking_module_RFID WHERE RFID = '${RFID}'`);

        // Extract the date from the query result
        const dbDate = result2.recordset[0].date_time;

        const secondResult = await mainPool.request()
            .query(`SELECT * FROM cell_sorting WHERE module_barcode = '${moduleBarcode}'`);

        if (secondResult.recordset.length > 0) {
            await mainPool.request()
                .query(`INSERT INTO clw_station_status (module_barcode, battery_pack_name, v1_status, v1_error) VALUES ('${moduleBarcode}', '${secondResult.recordset[0].battery_pack_name}', '${statusToStore}', '${v1error}')`);
                console.log('Data inserted');
        }
    }
}

async function processVision2(data, today_date) {
    if (data.vision2.OKStatus || data.vision2.NOKStatus) {
        const RFID = data.vision2.RFID;
        const v2_status = data.vision2.OKStatus ? 'OK' : 'NOK';
        const v2_error = data.vision2.ERRORStatus;

        const mainPool = await new ConnectionPool(mainDBConfig).connect();

        const result = await mainPool.request()
            .query(`SELECT module_barcode, date_time FROM linking_module_RFID WHERE RFID = '${RFID}'`);

        if (result.recordset.length > 0) {
            const { module_barcode, start_date } = result.recordset[0];

            // Update v2_date in linking_module_RFID
            await mainPool.request()
                .query(`UPDATE linking_module_RFID SET date_time = GETDATE() WHERE module_barcode = '${module_barcode}'`);

            // Insert into clw_station_status with today_date as v2_end_date
            await mainPool.request()
                .query(`INSERT INTO clw_station_status (module_barcode, v2_status, v2_error, v2_start_date, v2_end_date) VALUES ('${module_barcode}', '${v2_status}', '${v2_error}', '${start_date}', '${today_date}')`);
        } else {
            console.log(`No module found for RFID: ${RFID}`);
        }
    }
}



async function handleData() {
    const data = await fetchData();
    await processVision1(data);
    await processVision2(data);
}

let intervalId;

export default function handler(req, res) {
    if (req.method === 'GET') {
        if (!intervalId) {
            intervalId = setInterval(handleData, 5000);
        }
        res.status(200).json({ message: 'Data fetching started', moduleBarcode });
    } else {
        res.status(405).json({ message: 'Method not allowed' });
    }
}




























////2 connection part////////

// const mainDBConfig = {
//     user: 'admin',
//     password: 'admin',
//     server: 'DESKTOP-FKJATC0',
//     database: 'replus_treceability',
//     options: {
//         encrypt: false,
//         trustServerCertificate: true,
//     }
// };

// const secondDBConfig = {
//     user: "user_mis",
//     password: "admin",
//     database: "taco_treceability",
//     server: "DESKTOP-FCCFFB0",
  
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
// }
// };

// let moduleBarcode = 'static_module_barcode';

// async function fetchData() {
//   // Simulate fetching data from an external source
//   return {
//     vision1: { OKStatus: true, NOKStatus: false, ERRORStatus: 0, RFID: 'DA' },
//     vision2: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '13' },
//     welding: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '13' },
//     fpcb: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '' }
//   };
// }

// async function processVision1(data) {
//   let statusToStore = null;

//   if (data.vision1.OKStatus) {
//     statusToStore = 'OK';
//   } else if (data.vision1.NOKStatus) {
//     statusToStore = 'NOK';
//   }

//   if (statusToStore) {
//     const RFID = data.vision1.RFID;
//     const v1error = data.vision1.ERRORStatus;

//     const mainPool = await new ConnectionPool(mainDBConfig).connect(); // Changed instantiation and connection
//     const result = await mainPool.request()
//       .query(`SELECT * FROM link_module_RFID WHERE RFID = '${RFID}'`);
    
//     if (result.recordset.length > 0) {
//       await mainPool.request()
//         .query(`UPDATE link_module_RFID SET module_barcode = '${moduleBarcode}' WHERE RFID = '${RFID}'`);
//     } else {
//       await mainPool.request()
//         .query(`INSERT INTO link_module_RFID (RFID, module_barcode, date_time) VALUES ('${RFID}', '${moduleBarcode}', GETDATE())`);
//     }

//     const result2 = await mainPool.request()
//       .query(`SELECT date_time FROM link_module_RFID WHERE RFID = '${RFID}'`);

//     const secondPool = await new ConnectionPool(secondDBConfig).connect(); // Changed instantiation and connection
//     const secondResult = await secondPool.request()
//       .query(`SELECT * FROM cell_sorting WHERE module_barcode = '${moduleBarcode}'`);

//     if (secondResult.recordset.length > 0) {
//       const mainPool = await new ConnectionPool(mainDBConfig).connect(); // Changed instantiation and connection
//       await mainPool.request()
//         .query(`INSERT INTO clw_station_status (module_barcode, battery_pack_name,v1_status,v1_error,v1_start_date) VALUES ('${moduleBarcode}', '${secondResult.recordset[0].battery_pack_name}','${statusToStore}','${v1error}','${result2.recordset[0].date_time}')`);
//     }
//   }
// }

// async function processVision2(data) {
//   if (data.vision2.OKStatus || data.vision2.NOKStatus) {
//     const RFID = data.vision2.RFID;
//     const pool = await poolPromise1;

//     // Update `v2_date` against that module barcode
//     await pool.request()
//       .query(`UPDATE YourTable SET v2_date = GETDATE() WHERE modulebarcode = '${moduleBarcode}'`);

//     const result = await pool.request()
//       .query(`SELECT v2_date, modulebarcode FROM YourTable WHERE RFID = '${RFID}'`);

//     if (result.recordset.length > 0) {
//       const { v2_date, modulebarcode } = result.recordset[0];

//       const mainPool = await createPool(mainDBConfig);
//       await mainPool.request()
//         .query(`UPDATE MainTable SET v2_startdate = '${v2_date}', modulebarcode = '${modulebarcode}' WHERE RFID = '${RFID}'`);
//     }
//   }
// }

// async function handleData() {
//   const data = await fetchData();

//   await processVision1(data);
//   await processVision2(data);
// }

// export default async function handler(req, res) {
//   if (req.method === 'GET') {
//     setInterval(handleData, 5000);
//     res.status(200).json({ message: 'Data fetching started' });
//   } else {
//     res.status(405).json({ message: 'Method not allowed' });
//   }
// }
