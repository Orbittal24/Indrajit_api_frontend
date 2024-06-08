import { ApexOptions } from "apexcharts";
import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";

interface ChartThreeState {
  series: number[];
  title: string;
  title1: string;
  series1: number[];
  series2: string;

  vision1OK: number;
}

const options: ApexOptions = {
  chart: {
      type: "donut",
      width: "250px",
      height: "250px",
      fontFamily: "Satoshi, sans-serif",
  },
  plotOptions: {
      pie: {
          donut: {
              size: "60%",
              labels: {
                  show: true,
                  value: {
                      fontSize: '14px',
                      fontFamily: 'Satoshi, sans-serif',
                      color: '#000',
                  },
              },
          },
      },
  },
  colors: ["#4CAF50", "#FF5733"], // Change colors here
  labels: ["OK", "NOT OK"],
  legend: {
      show: false,
      position: "bottom",
  },
  dataLabels: {
      enabled: false,
  },
  responsive: [
      {
          breakpoint: 640,
          options: {
              chart: {
                  width: "100px",
                  height: "100px",
              },
          },
      },
  ],
};

const ChartThree: React.FC<{ title: string , title1: string, series1:number[], series2: string }> = ({ title ,series1, series2 ,title1 }) => {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [series, setSeries] = useState<number[]>([0,0]);

 
console.log(series);
  return (
    
    <div className="col-span-6 rounded-sm border border-stroke bg-white px-5 pb-5 pt-7.5 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:col-span-3">
      <div className="mb-3 justify-between gap-4 sm:flex">
        <div>
          <h1></h1>
          <h2 className="text-3xl font-semibold text-black dark:text-white">
            {title}</h2>
            <h6 className="text-1xl font-semibold text-black dark:text-white">
            {title1}</h6>
           
           
          
          
        </div>
      </div>

      <div className="mb-2">
        <div id="chartThree" className="mx-auto flex justify-center">
          <div style={{ width: '200px', height: '200px' }}>
            <ReactApexChart
              options={options}
              series={series1}
              type="donut"
            />
          </div>
        </div>
      </div>

      <div className="-mx-8 flex flex-wrap items-center justify-center gap-y-3">
       
        <div className="w-full px-8 sm:w-1/2">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#4CAF50]"></span>
            <h5 className="text-l font-semibold text-black dark:text-white">
              <span>OK:</span>
              <span>{series1[0]}</span>
            </h5>
          </div>
        </div>

        <div className="w-full px-8 sm:w-1/2">
          <div className="flex w-full items-center">
            <span className="mr-2 block h-3 w-full max-w-3 rounded-full bg-[#FF5733]"></span>
            <h5 className="text-l font-semibold text-black dark:text-white">
              <span>NOK: </span>
              <span>{series1[1]}</span>
            </h5>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChartThree;
