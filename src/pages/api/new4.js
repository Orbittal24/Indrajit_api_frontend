import { poolPromise, sql } from '../../dbConfig';

let moduleBarcode = 'static_module_barcode';

async function fetchData() {
  // Simulate fetching data from an external source
  return {
    vision1: { OKStatus: true, NOKStatus: false, ERRORStatus: 0, RFID: 'DA' },
    vision2: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '13' },
    welding: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '13' },
    fpcb: { OKStatus: false, NOKStatus: false, ERRORStatus: 0, RFID: '' }
  };
}

async function processVision1(data) {
  if (data.vision1.OKStatus || data.vision1.NOKStatus) {
    const RFID = data.vision1.RFID;
    const pool = await poolPromise;
    const result = await pool.request()
      .query(`SELECT * FROM YourTable WHERE RFID = '${RFID}'`);
    if (result.recordset.length > 0) {
      // Update the modulebarcode
      await pool.request()
        .query(`UPDATE YourTable SET modulebarcode = '${moduleBarcode}' WHERE RFID = '${RFID}'`);
    } else {
      // Insert new RFID and modulebarcode
      await pool.request()
        .query(`INSERT INTO YourTable (RFID, modulebarcode, date) VALUES ('${RFID}', '${moduleBarcode}', GETDATE())`);
    }
  }
}

async function processVision2(data) {
  if (data.vision2.OKStatus || data.vision2.NOKStatus) {
    const RFID = data.vision2.RFID;
    const pool = await poolPromise;
    // Insert getdate against that module barcode in v2_date
    await pool.request()
      .query(`UPDATE YourTable SET v2_date = GETDATE() WHERE modulebarcode = '${moduleBarcode}'`);
  }
}

async function handleData() {
  const data = await fetchData();

  await processVision1(data);
  await processVision2(data);
  // Implement similar functions for welding and fpcb
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    setInterval(handleData, 5000);
    res.status(200).json({ message: 'Data fetching started' });
  } else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}


after insert i want to check anothaer database so use another(second) connection  and  compare  and select  another  table data against  vision 1  RFID   and Modulebarcode   and  then  insert  that  compared  data  in  another  table(Main table )  use  first  connection 