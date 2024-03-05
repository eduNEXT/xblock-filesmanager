import React, { useState, forwardRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import DatePicker from 'react-datepicker';

import 'react-datepicker/dist/react-datepicker.css';

const DatePickerInput = forwardRef((props, ref) => {
  const { onChangePicker, dateFrom, dateTo } = props;
  const [dateRange, setDateRange] = useState([null, null]);
  const [startDate, endDate] = dateRange;

  const CustomDatePicker = forwardRef(({ onClick }, childRef) => (
    <button className="custom-date-picker" style={{ display: 'none' }} onClick={onClick} ref={childRef}></button>
  ));

  useEffect(() => {
    const rangeDatesTimeOut = setTimeout(() => setDateRange([dateFrom, dateTo]));

    return () => clearTimeout(rangeDatesTimeOut);
  }, [dateFrom, dateTo]);

  return (
    <DatePicker
      ref={ref}
      startDate={startDate}
      endDate={endDate}
      onChange={(date) => {
        if (onChangePicker) {
          onChangePicker(date);
        }

        setDateRange(date);
      }}
      customInput={<CustomDatePicker />}
      dateFormat="MMMM d, yyyy h:mm aa"
      selectsRange
      withPortal
    />
  );
});

DatePickerInput.defaultProps = {
  onChangePicker: () => {},
  dateFrom: '',
  dateTo: ''
};

DatePickerInput.propTypes = {
  onChangePicker: PropTypes.func,
  dateFrom: PropTypes.string,
  dateTo: PropTypes.string
};

export default DatePickerInput;
