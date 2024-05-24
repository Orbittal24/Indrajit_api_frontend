'use client'
import Link from "next/link";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { Metadata } from "next";
import DefaultLayout from "@/components/Layouts/DefaultLayout";
import { useState } from "react";

const Buttons = () => {
    const [buttonValue, setButtonValue] = useState('');

    const handleClick = async (value) => {

      console.log(value);
        try {
            // Send a request to your server endpoint with the specific value
            const response = await fetch('/api/your-endpoint', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ value }),
            });
            const data = await response.json();
            // Handle response if needed
        } catch (error) {
            console.error("Error:", error);
            // Handle error if needed
        }
    };

    return (
        <DefaultLayout>
            {/* Button to Send RFID Value */}
            <div className="m-5">
                <button
                    onClick={() => {
                        setButtonValue('RFID');
                        handleClick({RFID: "11111111111111"});
                    }}
                    className="inline-flex items-center justify-center bg-primary px-10 py-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
                >
                    RFID
                </button>
            </div>

            {/* Button to Send Other Values */}
            <div className="m-5">
                <button
                    onClick={() => {
                        setButtonValue('Status');
                        handleClick({
                            v1statusok: 0,
                            v1statusnot: 1,
                            errorcode: 0
                        });
                    }}
                    className="inline-flex items-center justify-center bg-primary px-10 py-4 text-center font-medium text-white hover:bg-opacity-90 lg:px-8 xl:px-10"
                >
                    Status
                </button>
            </div>
        </DefaultLayout>
    );
};

export default Buttons;
