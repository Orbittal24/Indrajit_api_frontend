import handler from './insertrfidmodule'; 
import sql from 'mssql';

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
        const pool = await sql.connect(destSqlConfig);

        // Insert each record into the destination table
        for (const record of data.matchedData) {
            const { module_barcode, battery_pack_name, v1_status,  v1_start_date } = record; // Replace with actual column names
            await pool.request()
                .input('module_barcode', sql.NVarChar, module_barcode)
                .input('battery_pack_name', sql.NVarChar, battery_pack_name)
                .input('v1_status', sql.NVarChar, v1_status)
                // .input('v2_status', sql.NVarChar, v2_status)
                .input('v1_start_date', sql.DateTime, v1_start_date)
                .query(`
                    INSERT INTO clw_station_status (module_barcode, battery_pack_name, v1_status, v1_start_date)
                    VALUES (@module_barcode, @battery_pack_name, @v1_status, @v1_start_date)
                `);
            console.log("Inserted data:", module_barcode, battery_pack_name, v1_status, v1_start_date);
        }
    } catch (error) {
        console.error('Error:', error);
        throw new Error('Error inserting data');
    } finally {
        // Close MSSQL connection
        await sql.close();
    }
};

export default insertData;
