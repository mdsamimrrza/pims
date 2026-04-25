import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import AppIcon from './AppIcon';
import { removeToast } from '../store/slices/toastSlice';

function iconForType(type) {
  if (type === 'success') {
    return 'checkCircle';
  }
  if (type === 'error') {
    return 'alert';
  }
  if (type === 'warning') {
    return 'info';
  }
  return 'info';
}

export default function ToastViewport() {
  const dispatch = useDispatch();
  const toasts = useSelector((state) => state.toast.items);

  useEffect(() => {
    const timers = toasts.map((toast) => (
      setTimeout(() => {
        dispatch(removeToast(toast.id));
      }, Math.max(1200, Number(toast.duration || 3600)))
    ));

    return () => {
      timers.forEach((timerId) => clearTimeout(timerId));
    };
  }, [dispatch, toasts]);

  if (!toasts.length) {
    return null;
  }

  return (
    <aside aria-live="polite" className="toast-viewport" aria-label="Notifications">
      {toasts.map((toast) => (
        <div className={`toast toast-${toast.type}`} key={toast.id} role="status">
          <div className="toast-accent" aria-hidden="true" />
          <div className="toast-icon">
            <AppIcon name={iconForType(toast.type)} size={18} />
          </div>
          <div className="toast-copy">
            <strong>{toast.title}</strong>
            {toast.message ? <div className="helper-text">{toast.message}</div> : null}
          </div>
          <button
            aria-label="Close notification"
            className="toast-close"
            onClick={() => dispatch(removeToast(toast.id))}
            type="button"
          >
            <AppIcon name="close" size={16} />
          </button>
        </div>
      ))}
    </aside>
  );
}
