import PropTypes from 'prop-types';
import './styles.css';

const spinnerDots = Array.from({ length: 12 }, (_, index) => <div key={index}></div>);

const Spinner = ({ height, width }) => {
  return (
    <div className="content-spinner" style={{ height, width }}>
      {spinnerDots}
    </div>
  );
};

Spinner.propTypes = {
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
};

export default Spinner;
