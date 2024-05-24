import { Package } from "@/types/package";

const packageData = [
  {
    name: "kanger",
    pack_number: "123456",
    module_barcode: `b345678`,
    visoin1_status: "OK",
    visoin2_status: "OK",
    welding_status: "OK",
    fpcb_welding_status: "NOTOK",
  },

  {
    name: "kanger",
    pack_number: "123456",
    module_barcode: `b345678`,
    visoin1_status: "OK",
    visoin2_status: "OK",
    welding_status: "OK",
    fpcb_welding_status: "NOTOK",
     

  },
  {
    name: "kanger",
    pack_number: "123456",
    module_barcode: `b345678`,
    visoin1_status: "NOTOK",
    visoin2_status: "OK",
    welding_status: "OK",
    fpcb_welding_status: "NOTOK",
     

  },
  {
    name: "kanger",
    pack_number: "123456",
    module_barcode: `b345678`,
    visoin1_status: "OK",
    visoin2_status: "OK",
    welding_status: "OK",
    fpcb_welding_status: "NOTOK",
     

  },
  {
    name: "kanger",
    pack_number: "123456",
    module_barcode: `b345678`,
    visoin1_status: "OK",
    visoin2_status: "OK",
    welding_status: "OK",
    fpcb_welding_status: "NOTOK",
     

  },
  
];

const TableThree = () => {
  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="max-w-full overflow-x-auto">
        
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="min-w-[2px] px-4 py-4 font-medium text-black dark:text-white xl:pl-11">
                #
              </th>
              <th className="min-w-[150px] px-4 py-4 font-medium text-black dark:text-white">
               Pack Name
              </th>
              <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">
               Teamp pack NO
              </th>
              <th className="px-4 py-4 font-medium text-black dark:text-white">
                Module Barcode
              </th>
              <th className="px-4 py-4 font-medium text-black dark:text-white">
                Vision 1
              </th>
              <th className="px-4 py-4 font-medium text-black dark:text-white">
              Vision 2
              </th>
              <th className="px-4 py-4 font-medium text-black dark:text-white">
                Welding
              </th>
              <th className="px-4 py-4 font-medium text-black dark:text-white">
                FPCB Welding
              </th>
            </tr>
          </thead>
          <tbody>
            {packageData.map((packageItem, key) => (
              <tr key={key}>

                <td className="border-b border-[#eee] px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
                  <h5 className="font-medium text-black dark:text-white">
                    {key+1}
                  </h5>
                </td>


                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {packageItem.name}
                  </p>
                </td>

                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {packageItem.pack_number}
                  </p>
                </td>
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p className="text-black dark:text-white">
                    {packageItem.module_barcode}
                  </p>
                </td>

                 



                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p
                    className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                      packageItem.visoin1_status === "OK"
                        ? "bg-success text-success"
                        : packageItem.visoin1_status === "NOTOK"
                          ? "bg-danger text-danger"
                          : "bg-warning text-warning"
                    }`}
                  >
                    {packageItem.visoin1_status}
                  </p>
                </td>

                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p
                    className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                      packageItem.visoin2_status === "OK"
                        ? "bg-success text-success"
                        : packageItem.visoin2_status === "NOTOK"
                          ? "bg-danger text-danger"
                          : "bg-warning text-warning"
                    }`}
                  >
                    {packageItem.visoin2_status}
                  </p>
                </td>

                 <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p
                    className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                      packageItem.welding_status === "OK"
                        ? "bg-success text-success"
                        : packageItem.welding_status === "NOTOK"
                          ? "bg-danger text-danger"
                          : "bg-warning text-warning"
                    }`}
                  >
                    {packageItem.welding_status}
                  </p>
                </td>
                
                <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                  <p
                    className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                      packageItem.fpcb_welding_status === "OK"
                        ? "bg-success text-success"
                        : packageItem.fpcb_welding_status === "NOTOK"
                          ? "bg-danger text-danger"
                          : "bg-warning text-warning"
                    }`}
                  >
                    {packageItem.fpcb_welding_status}
                  </p>
                </td>


              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TableThree;
