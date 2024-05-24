// src/pages/api/compare.js

import sql from 'mssql';

// Configuration for your comparison MSSQL database connection
const compareSqlConfig = {
  user: 'admin',
  password: 'admin',
  server: 'OMKAR',
  database: 'replus_treceability',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  }
};

export const compareData = async (selectedData) => {
  try {
    // Connect to MSSQL
    await sql.connect(compareSqlConfig);

    const matchedData = [];
    for (const record of selectedData) {

      // Replace column1 and column2 with actual column names
      const { module_barcode } = record;

      // Compare data against another table
      const result = await sql.query(`
      SELECT * FROM cell_sorting WHERE module_barcode = '${module_barcode}' 
      `);


      if (result.recordset.length > 0) {
        matchedData.push(...result.recordset);
      }
    }

    // Log the comparison results
    console.log('Comparison Results:', matchedData);

    return matchedData;
  } catch (error) {
    console.error('Error:', error);
    throw new Error('Error comparing data');
  } finally {
    // Close MSSQL connection
    await sql.close();
  }
};

export default async (req, res) => {
  if (req.method === 'POST') {
    try {
      const selectedData = req.body;
      const matchedData = await compareData(selectedData);
      res.status(200).json(matchedData);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
