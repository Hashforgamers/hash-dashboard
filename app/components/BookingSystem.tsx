import React, { useState } from 'react';
import ConsoleSelector from './ConsoleSelector';
import BookingForm from './BookingForm';
import { ConsoleType } from './types';

const BookingSystem: React.FC = () => {
  const [selectedAction, setSelectedAction] = useState<null | string>(null);
  const [selectedConsole, setSelectedConsole] = useState<ConsoleType | null>(null);

  const handleBack = () => {
    setSelectedConsole(null);
    setSelectedAction(null);
  };

  return (
    <div className=" rounded-xl shadow-lg p-4">
      {!selectedConsole ? (
        <ConsoleSelector 
          onSelectConsole={setSelectedConsole} 
        />
      ) : (
        <BookingForm 
          selectedConsole={selectedConsole} 
          onBack={handleBack} 
        />
      )}
    </div>
  );
};

export default BookingSystem;
