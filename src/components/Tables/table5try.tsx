"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TableThree = () => {
  const [data, setData] = useState([]);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [entriesToShow, setEntriesToShow] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProsubPkNo, setSelectedProsubPkNo] = useState(null); 

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchQuery, startDate, endDate, entriesToShow, currentPage, data]);

  const fetchData = async () => { 
    try {
      const response = await fetch("http://localhost:4500/api/dashbord");
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      const jsonData = await response.json();
      setData(jsonData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const filterData = () => {
    let results = data;

    //fuction for serch using pack number

  
    if (searchQuery) {
      const searchQueryNumber = Number(searchQuery); // Convert searchQuery to a number
    
      console.log('searchQuery', searchQuery);
      results = results.filter((item) =>
        item.Prosub_PkNo === searchQueryNumber
      );
      console.log('Filtered results', results);
    }
    
 
// fuction for serch data using start date and end date 

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Adjust the filter condition to include items within the selected range
      results = results.filter((item) => {
        const itemDate = new Date(item.QualityScannedDate);
        return itemDate >= start && itemDate <= end;
      });
    }

    const startIdx = (currentPage - 1) * entriesToShow;
    const endIdx = startIdx + entriesToShow;

    setFilteredData(results.slice(startIdx, endIdx));
  };



  //fuction for refresh page

  const handleRefresh = () => {
    setSearchQuery("");
    setStartDate("");
    setEndDate("");
    setCurrentPage(1);
    fetchData();
  };

  const totalPages = Math.ceil(data.length / entriesToShow);

  const handleClick = (pkNo) => {
    router.push(`/history?Prosub_PkNo=${pkNo}`);
  };

  return (
    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div className="max-w-full overflow-x-auto">
     
        <div className="flex justify-between mb-4">
 
          {/* button for display total entries in page */}
          <div className="entries-select">
            Show
            <select
              className="custom-select"
              value={entriesToShow}
              onChange={(e) => {
                setEntriesToShow(Number(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            entries
          </div>



          {/* button for search pack number using two dates */}
          <div className="search-input-group">
            <input
              type="date"
              className="custom-search-input"
              placeholder="Start Date"
              aria-label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
            <input
              type="date"
              className="custom-search-input"
              placeholder="End Date"
              aria-label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            <button className="custom-search-button" type="button" onClick={filterData}>
              Search
            </button>
          </div>


          {/* button for search using pack number */}
          <div className="search-input-group">
            <input
              type="text"
              className="custom-search-input"
              placeholder="Search Pack Number"
              aria-label="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="custom-search-button" type="button" onClick={filterData}>
              Search
            </button>
            {/* button for page refresh */}
            <button
              className="custom-refresh-button"
              type="button"
              onClick={handleRefresh}
            >
              Refresh
            </button>
          </div>
        </div>
        <table className="w-full table-auto">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-meta-4">
              <th className="min-w-[220px] px-4 py-4 font-medium text-black dark:text-white xl:pl-11">
                Pack Number
              </th>
              <th className="min-w-[150px] px-4 py-4 font-medium text-black dark:text-white">
                Date
              </th>
              <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">
                Pack Barcode
              </th>
              <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">
                Pack Status
              </th>
              <th className="px-4 py-4 font-medium text-black dark:text-white">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(filteredData) && filteredData.length > 0 ? (
              filteredData.map((item, index) => (
                <tr key={index}>
                  <td className="border-b border-[#eee] px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
                    <h5 className="font-medium text-black dark:text-white">
                      {item.Prosub_PkNo}
                    </h5>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {item.QualityScannedDate}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">
                      {item.Prosub_barcode}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p
                      className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                        item.Prosub_Status
                          ? "bg-success text-success"
                          : "bg-danger text-danger"
                      }`}
                    >
                      {item.Prosub_Status ? "Complete" : "Incomplete"}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <div className="flex items-center space-x-3.5">
                   
                    <button className="hover:text-primary"   onClick={() => router.push(`/dashboard/${item.Prosub_PkNo}`)}
>
      <svg
        className="fill-current"
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M8.99981 14.8219C3.43106 14.8219 0.674805 9.50624 0.562305 9.28124C0.47793 9.11249 0.47793 8.88749 0.562305 8.71874C0.674805 8.49374 3.43106 3.20624 8.99981 3.20624C14.5686 3.20624 17.3248 8.49374 17.4373 8.71874C17.5217 8.88749 17.5217 9.11249 17.4373 9.28124C17.3248 9.50624 14.5686 14.8219 8.99981 14.8219ZM1.85605 8.99999C2.4748 10.0406 4.89356 13.5562 8.99981 13.5562C13.1061 13.5562 15.5248 10.0406 16.1436 8.99999C15.5248 7.95936 13.1061 4.44374 8.99981 4.44374C4.89356 4.44374 2.4748 7.95936 1.85605 8.99999Z"
          fill=""
        />
        <path
          d="M9.00039 11.8437C8.76289 11.8437 8.53789 11.715 8.41289 11.5062L6.41289 8.00624C6.26864 7.75999 6.28739 7.45624 6.45614 7.22874C6.62489 7.01249 6.91239 6.92124 7.18114 7.01249L10.6811 8.01249C10.9311 8.08499 11.1061 8.28749 11.1436 8.54624L11.6436 12.0462C11.6811 12.2962 11.5811 12.5437 11.3749 12.7062C11.1686 12.8687 10.8754 12.915 10.6249 12.8187L8.62489 11.915C8.55095 11.8848 8.47417 11.8642 8.39614 11.8544C8.43037 11.8495 8.46513 11.8437 8.50039 11.8437H9.00039Z"
          fill=""
        />
      </svg>
    </button>


                      {/* <button className="hover:text-primary">
                        <svg
                          className="fill-current"
                          width="18"
                          height="18"
                          viewBox="0 0 18 18"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M9.0013 14.8219C3.43255 14.8219 0.676297 9.50624 0.563797 9.28124C0.479422 9.11249 0.479422 8.88749 0.563797 8.71874C0.676297 8.49374 3.43255 3.20624 9.0013 3.20624C14.57 3.20624 17.3263 8.49374 17.4388 8.71874C17.5232 8.88749 17.5232 9.11249 17.4388 9.28124C17.3263 9.50624 14.57 14.8219 9.0013 14.8219ZM1.8573 8.99999C2.47605 10.0406 4.8948 13.5562 9.0013 13.5562C13.1075 13.5562 15.5263 10.0406 16.145 8.99999C15.5263 7.95936 13.1075 4.44374 9.0013 4.44374C4.8948 4.44374 2.47605 7.95936 1.8573 8.99999Z"
                            fill=""
                          />
                          <path
                            d="M8.9987 8.15625C9.24245 8.15625 9.45655 7.94215 9.45655 7.6984V5.45625C9.45655 5.2125 9.24245 4.9984 8.9987 4.9984C8.75495 4.9984 8.54085 5.2125 8.54085 5.45625V7.6984C8.54085 7.94215 8.75495 8.15625 8.9987 8.15625Z"
                            fill=""
                          />
                          <path
                            d="M8.9987 10.4015C9.24245 10.4015 9.45655 10.1874 9.45655 9.94365C9.45655 9.6999 9.24245 9.4858 8.9987 9.4858C8.75495 9.4858 8.54085 9.6999 8.54085 9.94365C8.54085 10.1874 8.75495 10.4015 8.9987 10.4015Z"
                            fill=""
                          />
                        </svg>
                      </button> */}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="border-b border-[#eee] px-4 py-5 text-center dark:border-strokedark"
                  
                >
                  No data found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="pagination-container">
        <div className="pagination">
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              className={`pagination-button ${
                currentPage === i + 1 ? "active" : ""
              }`}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="pagination-button"
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
        </div>
      </div>
    </div>
  );
};

export default TableThree;
