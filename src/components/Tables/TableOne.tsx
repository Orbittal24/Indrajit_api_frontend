import { BRAND } from "@/types/brand";
import Image from "next/image";

const brandData: BRAND[] = [
  {
    weekly: "WEEKLY",
    // name: "Google",
    visitors: 30.011,
    revenues: 0,
    sales: 0,
    conversion:0,
    
  },
  {
    weekly: "MONTHALY",
    // name: "Google",
    visitors: 30.011,
    revenues: 0,
    sales: 0,
    conversion:0,
  },
  // {
  //   logo: "/images/brand/brand-03.svg",
  //   name: "Github",
  //   visitors: 30.011,
  //   revenues: 0,
  //   sales: 0,
  //   conversion: 3.7,
  // },
  // {
  //   logo: "WEEKLY",
  //   name: "Vimeo",
  //   visitors: 1.5,
  //   revenues: "3,580",
  //   sales: 389,
  //   conversion: 2.5,
  // },
  // {
  //   logo: "/images/brand/brand-05.svg",
  //   name: "Facebook",
  //   visitors: 3.5,
  //   revenues: "6,768",
  //   sales: 390,
  //   conversion: 4.2,
  // },
];

const TableOne = () => {
  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
        AVG CYCLE TIME OF WEEKLY & MONTHALY 
      </h4>

      <div className="flex flex-col">
        <div className="grid grid-cols-3 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
          <div className="p-2.5 xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
             period
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
              VISION1
            </h5>
          </div>
          <div className="p-2.5 text-center xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
            VISION2
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
             WELDING
            </h5>
          </div>
          <div className="hidden p-2.5 text-center sm:block xl:p-5">
            <h5 className="text-sm font-medium uppercase xsm:text-base">
             FPCB
            </h5>
          </div>
        </div>

        {brandData.map((brand, key) => (
          <div
            className={`grid grid-cols-3 sm:grid-cols-5 ${
              key === brandData.length - 1
                ? ""
                : "border-b border-stroke dark:border-strokedark"
            }`}
            key={key}
          >
            <div className="flex items-center gap-3 p-2.5 xl:p-5">
              <div className="flex-shrink-0">
              <p className="hidden text-black dark:text-white sm:block">
                {brand.weekly}
              </p>
              </div>
              {/* <p className="hidden text-black dark:text-white sm:block">
                {brand.name}
              </p> */}
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-black dark:text-white">{brand.visitors}%</p>
            </div>

            <div className="flex items-center justify-center p-2.5 xl:p-5">
              <p className="text-meta-3">{brand.revenues}%</p>
            </div>

            <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
              <p className="text-black dark:text-white">{brand.sales}%</p>
            </div>

            <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
              <p className="text-meta-5">{brand.conversion}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableOne;
// "use client";

// import { useEffect, useState } from 'react';
// import axios from 'axios';

// const TableOne = () => {
//   const [brandData, setBrandData] = useState([]);

//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const response = await axios.get('http://localhost:5501/api/CountAll');
//         const data = response.data;

//         const formattedData = [
//           {
//             period: 'WEEKLY',
//             vision1: data.vision1weekavg || "-",
//             vision2: data.vision2weekavg,
//             welding: data.weldingweekavg,
//             fpcb: data.fpcbweekavg,
//           },
//           {
//             period: 'MONTHLY',
//             vision1: data.vision1monthavg  || "-",
//             vision2: data.vision2monthavg,
//             welding: data.weldingmonthavg,
//             fpcb: data.fpcbmonthavg,
//           }
//         ];

//         setBrandData(formattedData);
//       } catch (error) {
//         console.error('Error fetching data:', error);
//       }
//     };

//     fetchData();
//   }, []);

//   return (
//     <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
//       <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
//         AVG OF WEEKLY & MONTHLY CYCLE TIME
//       </h4>

//       <div className="flex flex-col">
//         <div className="grid grid-cols-5 rounded-sm bg-gray-2 dark:bg-meta-4 sm:grid-cols-5">
//           <div className="p-2.5 xl:p-5">
//             <h5 className="text-sm font-medium uppercase xsm:text-base">
//               PERIOD
//             </h5>
//           </div>
//           <div className="p-2.5 text-center xl:p-5">
//             <h5 className="text-sm font-medium uppercase xsm:text-base">
//               VISION1
//             </h5>
//           </div>
//           <div className="p-2.5 text-center xl:p-5">
//             <h5 className="text-sm font-medium uppercase xsm:text-base">
//               VISION2
//             </h5>
//           </div>
//           <div className="hidden p-2.5 text-center sm:block xl:p-5">
//             <h5 className="text-sm font-medium uppercase xsm:text-base">
//               WELDING
//             </h5>
//           </div>
//           <div className="hidden p-2.5 text-center sm:block xl:p-5">
//             <h5 className="text-sm font-medium uppercase xsm:text-base">
//               FPCB
//             </h5>
//           </div>
//         </div>

//         {brandData.map((brand, key) => (
//           <div
//             className={`grid grid-cols-5 ${
//               key === brandData.length - 1
//                 ? ""
//                 : "border-b border-stroke dark:border-strokedark"
//             }`}
//             key={key}
//           >
//             <div className="flex items-center gap-3 p-2.5 xl:p-5">
//               <div className="flex-shrink-0">
//                 <p className="text-black dark:text-white">{brand.period}</p>
//               </div>
//             </div>

//             <div className="flex items-center justify-center p-2.5 xl:p-5">
//               <p className="text-black dark:text-white">{brand.vision1}%</p>
//             </div>

//             <div className="flex items-center justify-center p-2.5 xl:p-5">
//               <p className="text-meta-3">{brand.vision2}%</p>
//             </div>

//             <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
//               <p className="text-black dark:text-white">{brand.welding}%</p>
//             </div>

//             <div className="hidden items-center justify-center p-2.5 sm:flex xl:p-5">
//               <p className="text-meta-5">{brand.fpcb}%</p>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default TableOne;
