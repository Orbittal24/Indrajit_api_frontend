import axios from 'axios';
import { selectData } from './selectmodule';
import { compareData } from './comparebarcode';
import { insertData } from './insertmoduledata';
import { moduleBarcode } from './getbarcode'; // Importing the module barcode
import { rfidDetails } from './getrfid';      // Importing the RFID details

export default async (req, res) => {
  if (req.method === 'POST') {
    try {
      // Step 1: Process module barcode
      console.log('Module Barcode:', moduleBarcode);

      // Step 2: Get RFID details
      const { RFID, v1statusok, v1statusnot } = rfidDetails;

      // Step 3: Check RFID status and proceed if valid
      if (v1statusok === 1 || v1statusnot === 1) {
        // Step 4: Select data from the source database
        const selectedData = await selectData();

        // Step 5: Compare data against another table
        const matchedData = await compareData(selectedData);

        // Step 6: Combine the data with RFID details and module barcode
        const combinedData = { selectedData, matchedData, RFID, moduleBarcode };

        // Step 7: Insert data into the destination database
        await insertData(combinedData);

        res.status(200).json({ message: 'Data transferred successfully' });
      } else {
        res.status(400).json({ message: 'RFID status not valid for data transfer' });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
};
