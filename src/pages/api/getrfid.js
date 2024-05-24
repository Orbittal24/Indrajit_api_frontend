export const rfidDetails = {
    v1RFID: "mnbvc",
    v1OKstatus: "True",
    v1NOKstatus: "false",
    v1ERRORstatus: 0
};

export default function handler(req, res) {
    res.status(200).json(rfidDetails);
}

// for hercules
// // pages/api/getrfid.js
// export default function handler(req, res) {
//     if (req.method === 'GET') {
//         // Log the request data to the console
//         console.log('Request Data:', req.query);

//         // Store the data received from Hercules in the responseData variable
//         const responseData = req.query;

//         // Log the response data to the console
//         console.log('Response Data:', responseData);

//         // Send the response back to the client
//         res.status(200).json(responseData);
//     } else {
//         // If the request method is not GET, return 405 Method Not Allowed
//         res.setHeader('Allow', ['GET']);
//         res.status(405).end(`Method ${req.method} Not Allowed`);
//     }
// }







// export default function handler(req, res) {
//     if (req.method === 'GET') {
//         // Log the request data to the console
//         console.log('Request Data:', req.body);


//         const responseData = ;

//         // Log the response data to the console
//         console.log('Response Data:', responseData);

//         // Send the response back to the client
//         res.status(200).json(responseData);
//     } else {
//         // If the request method is not GET, return 405 Method Not Allowed
//         res.setHeader('Allow', ['GET']);
//         res.status(405).end(`Method ${req.method} Not Allowed`);
//     }
// }

