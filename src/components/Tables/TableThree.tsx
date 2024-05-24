"use client";

import { useEffect, useState } from 'react';

const TableThree = () => {
  const [packageData, setPackageData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [entriesToShow, setEntriesToShow] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/clw_station_status');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }
        const data = await response.json();
        setPackageData(data);
        setFilteredData(data);
        console.log("Fetched data:", data); // Log the fetched data
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filterData = () => {
    let filtered = packageData;

    if (startDate && !endDate) {
      filtered = filtered.filter(item =>
        new Date(item.v1_end_date) >= new Date(startDate) ||
        new Date(item.v2_end_date) >= new Date(startDate) ||
        new Date(item.welding_end_date) >= new Date(startDate) ||
        new Date(item.fpcb_end_date) >= new Date(startDate)
      );
    } else if (!startDate && endDate) {
      filtered = filtered.filter(item =>
        new Date(item.v1_end_date) <= new Date(endDate) ||
        new Date(item.v2_end_date) <= new Date(endDate) ||
        new Date(item.welding_end_date) <= new Date(endDate) ||
        new Date(item.fpcb_end_date) <= new Date(endDate)
      );
    } else if (startDate && endDate) {
      filtered = filtered.filter(item => {
        const v1EndDate = new Date(item.v1_end_date);
        const v2EndDate = new Date(item.v2_end_date);
        const weldingEndDate = new Date(item.welding_end_date);
        const fpcbEndDate = new Date(item.fpcb_end_date);

        return (
          (v1EndDate >= new Date(startDate) && v1EndDate <= new Date(endDate)) ||
          (v2EndDate >= new Date(startDate) && v2EndDate <= new Date(endDate)) ||
          (weldingEndDate >= new Date(startDate) && weldingEndDate <= new Date(endDate)) ||
          (fpcbEndDate >= new Date(startDate) && fpcbEndDate <= new Date(endDate))
        );
      });
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.module_barcode.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset current page to 1 after search
    console.log("Filtered data:", filtered); // Log the filtered data
  };

  const handleSearch = () => {
    filterData();
  };

  const handleRefresh = () => {
    setStartDate('');
    setEndDate('');
    setSearchQuery('');
    setFilteredData(packageData);
    setCurrentPage(1); // Reset current page to 1
  };

  const displayedData = filteredData.slice(
    (currentPage - 1) * entriesToShow,
    currentPage * entriesToShow
  );

  console.log("Displayed data:", displayedData); // Log the displayed data

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div>
      <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
        <div className="max-w-full overflow-x-auto">
          <div className="flex justify-between mb-4">
            <div className="entries-select">
              <label htmlFor="entries">Show</label>
              <select
                id="entries"
                className="form-select"
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
              <label htmlFor="entries">entries</label>
            </div>

            <div className="search-input-group">
              <input
                type="date"
                id="startDate"
                className="form-control me-2"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              <input
                type="date"
                id="endDate"
                className="form-control me-2"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              <button className="btn btn-primary" type="button" onClick={handleSearch}>
                Search
              </button>
            </div>

            <div className="search-input-group">
              <input
                type="text"
                id="searchQuery"
                className="form-control me-2"
                placeholder="Search module barcode"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button className="btn btn-primary me-2" type="button" onClick={handleSearch}>
                Search
              </button>
              <button
                className="btn btn-secondary"
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
                <th className="min-w-[2px] px-4 py-4 font-medium text-black dark:text-white xl:pl-11">
                  #
                </th>
                <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">
                  Pack Name
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
              {displayedData.map((packageItem, key) => (
                <tr key={key}>
                  <td className="border-b border-[#eee] px-4 py-5 pl-9 dark:border-strokedark xl:pl-11">
                    <h5 className="font-medium text-black dark:text-white">
                      {key + 1 + (currentPage - 1) * entriesToShow}
                    </h5>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">{packageItem.battery_pack_name}</p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p className="text-black dark:text-white">{packageItem.module_barcode}</p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p
                      className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                        packageItem.v1_status === 'OK'
                          ? 'bg-success text-success'
                          : packageItem.v1_status === 'NOT OK'
                          ? 'bg-danger text-danger'
                          : 'bg-warning text-warning'
                      }`}
                    >
                      {packageItem.v1_status || '-'}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p
                      className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                        packageItem.v2_status === 'OK'
                          ? 'bg-success text-success'
                          : packageItem.v2_status === 'NOT OK'
                          ? 'bg-danger text-danger'
                          : 'bg-warning text-warning'
                      }`}
                    >
                      {packageItem.v2_status || '-'}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p
                      className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                        packageItem.welding_status === 'OK'
                          ? 'bg-success text-success'
                          : packageItem.welding_status === 'NOT OK'
                          ? 'bg-danger text-danger'
                          : 'bg-warning text-warning'
                      }`}
                    >
                      {packageItem.welding_status || '-'}
                    </p>
                  </td>
                  <td className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
                    <p
                      className={`inline-flex rounded-full bg-opacity-10 px-3 py-1 text-sm font-medium ${
                        packageItem.fpcb_status === 'OK'
                          ? 'bg-success text-success'
                          : packageItem.fpcb_status === 'NOT OK'
                          ? 'bg-danger text-danger'
                          : 'bg-warning text-warning'
                      }`}
                    >
                      {packageItem.fpcb_status || '-'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableThree;
