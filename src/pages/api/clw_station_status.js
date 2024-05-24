// pages/api/clw_station_status.js
import sql from 'mssql';

const config = {
  user: 'admin2',
  password: 'reset@123',
  server: 'REP-TRACE', // Make sure this is the correct server name
  database: 'replus_treceability',
  options: {
    encrypt: false, // Set to true if you're connecting to Azure SQL Database
    enableArithAbort: true,
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Establish the database connection
      await sql.connect(config);
      
      // Execute the query
      const result = await sql.query('SELECT * FROM [dbo].[clw_station_status]');
      console.log("queryresult",result);
      // Return the results
      res.status(200).json(result.recordset);
      
    } catch (error) {
      console.error('Database query error:', error);
      res.status(500).json({ message: 'Internal Server Error', error: error.message });
    } finally {
      // Close the connection
      sql.close();
    }
  } else {
    res.status(405).json({ message: 'Method Not Allowed' });
  }
}
