import React from 'react';
import Link from 'next/link';

interface DropdownButtonProps {
  href: string;
  children: React.ReactNode;
}

const DropdownButton: React.FC<DropdownButtonProps> = ({ href, children }) => {
  return (
    <Link href={href}>
      <button>
        {children}
        <style jsx>{`
          button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            margin-left: 93%;
          }
          button:hover {
            background-color: #0056b3;
          }
        `}</style>
      </button>
    </Link>
  );
};

export default DropdownButton;
