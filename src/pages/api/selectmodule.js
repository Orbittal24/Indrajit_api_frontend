// src/pages/api/select.js

import sql from 'mssql';

// Configuration for your source MSSQL database connection
const sourceSqlConfig = {
  user: 'admin',
  password: 'admin',
  server: 'DESKTOP-FKJATC0',
  database: 'replus_treceability',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

export const selectData = async () => {
  try {
    // Connect to MSSQL
    await sql.connect(sourceSqlConfig);

    // Execute the query
    const result = await sql.query('SELECT * FROM link_module_RFID');

    // Log the query results
    console.log('Query Results:', result.recordset);

    return result.recordset;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Error selecting data');
  } finally {
    // Close MSSQL connection
    await sql.close();
  }
};

export default async (req, res) => {
  if (req.method === 'GET') {
    try {
      const data = await selectData();
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}; 