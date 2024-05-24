// src/pages/api/insert.js

import sql from 'mssql';

// Configuration for your destination MSSQL database connection
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

export const insertData = async (data) => {
  try {
    // Connect to the destination MSSQL
    await sql.connect(destSqlConfig);

    // Insert each record into the destination table
    for (const record of data.matchedData) {
      const { module_barcode,battery_pack_name } = record; // replace with actual column names
      await sql.query(`
      INSERT INTO clw_station_status (module_barcode,battery_pack_name)
      VALUES ('${module_barcode}','${battery_pack_name}')
      `);
      console.log("maindata::::",module_barcode,battery_pack_name);
    }
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Error inserting data');
  } finally {
    // Close MSSQL connection
    await sql.close();
  }
};

export default async (req, res) => {
  if (req.method === 'POST') {
    try {
      const {  matchedData } = req.body;
      const combinedData = [...matchedData];
      await insertData(combinedData);
      res.status(200).json({ message: 'Data inserted successfully' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};

