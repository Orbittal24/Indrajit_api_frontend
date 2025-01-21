"use client";

import React, { useEffect, useState } from "react";
import ChartThree from "../../components/Charts/ChartThree";
import CardDataStats from "../../components/CardDataStats";
import { Card } from "reactstrap";
import Header1 from "@/components/Header";
import Header from "../../components/Header/DropdownUser";
import Swal from "sweetalert2";
import './swal.css'; 
import './style.css';

const ECommerce: React.FC = () => {
  const [vision1Series, setVision1Series] = useState<number[]>([0, 0]);
  const [vision2Series, setVision2Series] = useState<number[]>([0, 0]);
  const [weldingSeries, setWeldingSeries] = useState<number[]>([0, 0]);
  const [fpcbSeries, setFpcbSeries] = useState<number[]>([0, 0]);
  const [currentShift, setCurrentShift] = useState<string>("");
  const [v1difference, setV1Diff] = useState<number[]>([0]);
  const [v2difference, setV2Diff] = useState<number[]>([0]);
  const [weldingdifference, setWeldingDiff] = useState<number[]>([0]);
  const [fpcbdifference, setFpcbDiff] = useState<number[]>([0]);
  const [moduleBarcode1, setModuleBarcode1] = useState<string>("");
  const [moduleBarcode2, setModuleBarcode2] = useState<string>("");
  const [moduleBarcode3, setModuleBarcode3] = useState<string>("");
  const [moduleBarcode4, setModuleBarcode4] = useState<string>("");
  const [wsMessage, setWsMessage] = useState<string>("");

  const determineShift = () => {
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    if (currentHour >= 6 && currentHour < 14) {
      return "A";
    } else if (currentHour >= 14 && currentHour < 22) {
      return "B";
    } else {
      return "C";
    }
  };

  // WebSocket connection and popup logic
  useEffect(() => {
    const ws = new WebSocket('ws://10.5.0.20:6090');  // Connect to backend WebSocket

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };
 
    ws.onmessage = (event) => {
      const messageData = JSON.parse(event.data);
      
      // Check if it's an error based on the `type` field sent from the backend
      const isError = messageData.type === 'error';
    
      // Split the message into lines and define the type for 'line'
      const messageLines = messageData.message.split('\n').map((line: string) => `<strong>${line}</strong>`).join('<br>');
    
      if (isError) {
        // Display error popup
        Swal.fire({
          title: "<strong style='color:red'>Error</strong>", // Bold and red "Error"
          html: `<p style="color:red">${messageLines}</p>`, // Bold message lines
          icon: 'error',
          timer: 5000,
          showConfirmButton: false,
        });
      } else {
        // Display success popup
        Swal.fire({
          title: "Success",
          html: `<p style="color:red">${messageLines}</p>`, // Bold message lines
          icon: 'success',
          timer: 5000, 
          showConfirmButton: false,
        });
      }
    };
      
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      // console.log('WebSocket connection closed');
    };

    return () => {
      // ws.close();
    };
  }, []);

  useEffect(() => {
    const ws = new WebSocket('ws://10.5.0.20:6090');

    ws.onopen = () => {
      console.log('WebSocket connection established');
    };

    ws.onmessage = (event) => {
      const messageData = JSON.parse(event.data);
      setWsMessage(messageData.message);

      if (messageData.data) {
        setVision1Series(messageData.data.vision1 || [0, 0]);
        setVision2Series(messageData.data.vision2 || [0, 0]);
        setWeldingSeries(messageData.data.welding || [0, 0]);
        setFpcbSeries(messageData.data.fpcb || [0, 0]);
        setModuleBarcode1(messageData.data.moduleBarcode1 || "");
        setModuleBarcode2(messageData.data.moduleBarcode2 || "");
        setModuleBarcode3(messageData.data.moduleBarcode3 || "");
        setModuleBarcode4(messageData.data.moduleBarcode4 || "");
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

   

    const fetchData = async () => {
      try {
        const response = await fetch("http://10.5.0.20:5501/api/CountAll");
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const result = await response.json();
        const data = result.data[0];
        const liveStatuses = result.liveStatuses;
    
        const shift = determineShift();
        setCurrentShift(shift); // Set the current shift here
    
        let vision1, vision2, welding, fpcb, moduleBarcode1, moduleBarcode2, moduleBarcode3, moduleBarcode4;
        if (shift === "A") {
          vision1 = [data.v1_first_shift_ok, data.v1_first_shift_notok];
          vision2 = [data.v2_first_shift_ok, data.v2_first_shift_notok];
          welding = [data.welding_first_shift_ok, data.welding_first_shift_notok];
          fpcb = [data.fpcb_first_shift_ok, data.fpcb_first_shift_notok];
          moduleBarcode1 = liveStatuses.v1.join('\n');
          moduleBarcode2 = liveStatuses.v2.join('\n');
          moduleBarcode3 = liveStatuses.welding.join('\n');
          moduleBarcode4 = liveStatuses.fpcb.join('\n');
        } else if (shift === "B") {
          vision1 = [data.v1_second_shift_ok, data.v1_second_shift_notok];
          vision2 = [data.v2_second_shift_ok, data.v2_second_shift_notok];
          welding = [data.welding_second_shift_ok, data.welding_second_shift_notok];
          fpcb = [data.fpcb_second_shift_ok, data.fpcb_second_shift_notok];
          moduleBarcode1 = liveStatuses.v1.join('\n');
          moduleBarcode2 = liveStatuses.v2.join('\n');
          moduleBarcode3 = liveStatuses.welding.join('\n');
          moduleBarcode4 = liveStatuses.fpcb.join('\n');
        } else {
          vision1 = [data.v1_third_shift_ok, data.v1_third_shift_notok];
          vision2 = [data.v2_third_shift_ok, data.v2_third_shift_notok];
          welding = [data.welding_third_shift_ok, data.welding_third_shift_notok];
          fpcb = [data.fpcb_third_shift_ok, data.fpcb_third_shift_notok];
          moduleBarcode1 = liveStatuses.v1.join('\n');
          moduleBarcode2 = liveStatuses.v2.join('\n');
          moduleBarcode3 = liveStatuses.welding.join('\n');
          moduleBarcode4 = liveStatuses.fpcb.join('\n');
        }
    
        setVision1Series(vision1);
        setVision2Series(vision2);
        setWeldingSeries(welding);
        setFpcbSeries(fpcb);
        setModuleBarcode1(moduleBarcode1);
        setModuleBarcode2(moduleBarcode2);
        setModuleBarcode3(moduleBarcode3);
        setModuleBarcode4(moduleBarcode4);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 2000); 

    return () => {
      clearInterval(interval);
      // ws.close();
    };
  }, []);

  return (
    <>
      <Header1 sidebarOpen={undefined} setSidebarOpen={function (arg0: boolean): void {
        throw new Error("Function not implemented.");
      }} />

      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-3 2xl:gap-7.5">
          <CardDataStats total={`Shift  ${currentShift}`}>
            <svg className="fill-success dark:fill-white" width="22" height="16" viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11 15.1156C4.19376 15.1156 0.825012 8.61876 0.687512 8.34376C0.584387 8.13751 0.584387 7.86251 0.687512 7.65626C0.825012 7.38126 4.19376 0.918762 11 0.918762C17.8063 0.918762 21.175 7.38126 21.3125 7.65626C21.4156 7.86251 21.4156 8.13751 21.3125 8.34376C21.175 8.61876 17.8063 15.1156 11 15.1156ZM2.26876 8.00001C3.02501 9.27189 5.98126 13.5688 11 13.5688C16.0188 13.5688 18.975 9.27189 19.7313 8.00001C18.975 6.72814 16.0188 2.43126 11 2.43126C5.98126 2.43126 3.02501 6.72814 2.26876 8.00001Z" fill=""/>
              <path d="M11 10.9219C9.38438 10.9219 8.07812 9.61562 8.07812 8C8.07812 6.38438 9.38438 5.07812 11 5.07812C12.6156 5.07812 13.9219 6.38438 13.9219 8C13.9219 9.61562 12.6156 10.9219 11 10.9219ZM11 6.52501C10.0344 6.52501 9.25312 7.30626 9.25312 8.27188C9.25312 9.23751 10.0344 10.0188 11 10.0188C11.9656 10.0188 12.7469 9.23751 12.7469 8.27188C12.7469 7.30626 11.9656 6.52501 11 6.52501Z" fill=""/>
            </svg>
          </CardDataStats>
          <CardDataStats 
            total={`V1 CycleTime(min): ${v1difference}/480`}
            total1={`V2 CycleTime(min): ${v2difference}/480`}>
            <svg className="fill-warning" width="22" height="18" viewBox="0 0 22 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.0062 0.618744H2.99372C1.3406 0.618744 0 1.96874 0 3.62187V14.3781C0 16.0312 1.3406 17.3812 2.99372 17.3812H19.0062C20.6594 17.3812 22 16.0312 22 14.3781V3.62187C22 1.96874 20.6594 0.618744 19.0062 0.618744ZM19.0062 2.06562C19.525 2.06562 19.9625 2.50624 19.9625 3.02501V5.39374H2.03748V3.02501C2.03748 2.50624 2.475 2.06562 2.99372 2.06562H19.0062ZM1.2156 11.8812V7.16562H3.28435L3.70935 9.09062C3.87185 9.81249 4.5531 10.3156 5.2906 10.3156C6.0281 10.3156 6.70935 9.81249 6.87185 9.09062L7.29685 7.16562H12.75L12.3031 10.7156C12.2218 11.3406 11.6625 11.8125 11.0343 11.8125C10.4062 11.8125 9.8656 11.3406 9.76872 10.7156C9.71247 10.3844 9.40935 10.1406 9.07185 10.1406C8.7156 10.1406 8.44372 10.4125 8.4906 10.7687C8.6781 12.1187 9.77185 13.1375 11.1125 13.1375C12.2125 13.1375 13.1968 12.3156 13.3906 11.2187L13.8687 7.67812H15.5906C15.8531 7.67812 16.0375 7.90937 15.9968 8.17187L15.5406 11.6125C15.4937 11.9562 15.7562 12.2562 16.1 12.3062C16.4437 12.3562 16.7406 12.1031 16.7906 11.7594L17.2468 8.31874C17.3156 7.83437 16.9312 7.39374 16.4406 7.39374H14.1906L14.5531 4.49687H18.6968V11.8812H1.2156ZM11.4812 4.49687H6.87185C6.375 4.49687 5.925 4.83437 5.78435 5.31562L5.5931 6.06562H4.61872C4.175 6.06562 3.76872 6.34687 3.60622 6.76874L3.2156 8.06562H1.2156V5.39374H11.4812V4.49687ZM1.2156 14.8031V13.3375H18.6968V14.8031C18.6968 15.3219 18.2594 15.7625 17.7406 15.7625H2.17185C1.6531 15.7625 1.2156 15.3219 1.2156 14.8031Z" fill=""/>
            </svg>
          </CardDataStats>

          <CardDataStats total={`Welding CycleTime(min): ${weldingdifference}/480`}
            total1={`FPCB CycleTime(min): ${fpcbdifference}/480`}>
            <svg className="fill-warning dark:fill-white" width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M21.1063 18.0469L19.3875 3.23126C19.2157 1.71876 17.9438 0.584381 16.3969 0.584381H5.56878C4.05628 0.584381 2.78441 1.71876 2.57816 3.23126L0.859406 18.0469C0.756281 18.9063 1.03128 19.7313 1.61566 20.3844C2.20003 21.0375 2.99066 21.3813 3.85003 21.3813H18.1157C18.975 21.3813 19.8 21.0031 20.35 20.3844C20.9 19.7656 21.2094 18.9063 21.1063 18.0469ZM19.2157 19.3531C18.9407 19.6625 18.5625 19.8344 18.15 19.8344H3.85003C3.43753 19.8344 3.05941 19.6625 2.78441 19.3531C2.50941 19.0438 2.37191 18.6313 2.44066 18.2188L4.12503 3.43751C4.19378 2.71563 4.81253 2.16563 5.56878 2.16563H16.4313C17.1532 2.16563 17.7719 2.71563 17.875 3.43751L19.5938 18.2531C19.6282 18.6656 19.4907 19.0438 19.2157 19.3531Z" fill=""/>
              <path d="M14.3345 5.29375C13.922 5.39688 13.647 5.80938 13.7501 6.22188C13.7845 6.42813 13.8189 6.63438 13.8189 6.80625C13.8189 8.35313 12.547 9.625 11.0001 9.625C9.45327 9.625 8.1814 8.35313 8.1814 6.80625C8.1814 6.6 8.21577 6.42813 8.25015 6.22188C8.35327 5.80938 8.07827 5.39688 7.66577 5.29375C7.25327 5.19063 6.84077 5.46563 6.73765 5.87813C6.6689 6.1875 6.63452 6.49688 6.63452 6.80625C6.63452 9.2125 8.5939 11.1719 11.0001 11.1719C13.4064 11.1719 15.3658 9.2125 15.3658 6.80625C15.3658 6.49688 15.3314 6.1875 15.2626 5.87813C15.1595 5.46563 14.747 5.225 14.3345 5.29375Z" fill=""/>
            </svg>
          </CardDataStats>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2 md:gap-0 xl:grid-cols-4 2xl:gap-7.5">
        <Card className="m-4">
          {vision1Series.length > 0 && <ChartThree title="Vision 1" series1={vision1Series} />}
          <div className="barcode-inputs">
          <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 1</label>
            <input type="text" value={moduleBarcode1.split(',')[0] || ''} className="module-input" readOnly />
           <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 2</label>
            <input type="text" value={moduleBarcode1.split(',')[1] || ''} className="module-input" readOnly />
          </div>
        </Card>
        
        <Card className="m-4">
          {vision2Series.length > 0 && <ChartThree title="Vision 2" series1={vision2Series} />}
          <div className="barcode-inputs">
          <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 1</label>
            <input type="text" value={moduleBarcode2.split(',')[0] || ''} className="module-input" readOnly />
          <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 2</label>
            <input type="text" value={moduleBarcode2.split(',')[1] || ''} className="module-input" readOnly />
          </div>
        </Card>
        
        <Card className="m-4">
          {weldingSeries.length > 0 && <ChartThree title="Welding" series1={weldingSeries} />}
          <div className="barcode-inputs">
          <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 1</label>
            <input type="text" value={moduleBarcode3.split(',')[0] || ''} className="module-input" readOnly />
          <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 2</label>
            <input type="text" value={moduleBarcode3.split(',')[1] || ''} className="module-input" readOnly />
          </div>
        </Card>
        
        <Card className="m-4">
          {fpcbSeries.length > 0 && <ChartThree title="FPCB Welding" series1={fpcbSeries} />}
          <div className="barcode-inputs">
          <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 1</label>
            <input type="text" value={moduleBarcode4.split(',')[0] || ''} className="module-input" readOnly />
          <label htmlFor="moduleBarcode1Field1" style={{ fontWeight: 'bold' }}>Live Module 2</label>
            <input type="text" value={moduleBarcode4.split(',')[1] || ''} className="module-input" readOnly />
          </div>
        </Card>
      </div>

      <style jsx>{`
        .module-input {
          width: 100%;
          resize: none;
          border: 1px solid #ccc;
          border-radius: 4px;
          padding: 5px;
          font-size: 18px;
          font-weight: bold; /* Make the text bold */
          color: black; /* Set the text color to black */
          margin-bottom: 5px;
        }
        .barcode-inputs {
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </>
  );
};

export default ECommerce;
