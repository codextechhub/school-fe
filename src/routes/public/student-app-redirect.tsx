import { useEffect } from "react";

/** Loads the separate student app after the school site's `/student` request. */
export default function StudentAppRedirect() {
  useEffect(() => {
    window.location.replace(`/student/${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
