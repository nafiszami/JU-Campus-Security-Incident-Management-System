/**
 * Loading spinner component
 * @param {Object} props - Component props
 * @param {string} [props.size='medium'] - Size of spinner (small, medium, large)
 * @param {string} [props.message='Loading...'] - Loading message
 * @returns {JSX.Element} Loading spinner
 */
export function LoadingSpinner({ size = 'medium', message = 'Loading...' }) {
  const sizeClass = {
    small: 'spinner-sm',
    medium: 'spinner-md',
    large: 'spinner-lg',
  };

  return (
    <div className={`loading-spinner ${sizeClass[size]}`}>
      <div className="spinner"></div>
      <p>{message}</p>
    </div>
  );
}