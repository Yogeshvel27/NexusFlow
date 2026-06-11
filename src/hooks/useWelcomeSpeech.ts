import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";

export function useWelcomeSpeech() {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded || !user) return;

    // Verify if the welcome speech has already run in this login session
    const hasBeenWelcomed = sessionStorage.getItem("nf_welcomed");

    if (!hasBeenWelcomed) {
      const name = user.firstName || user.fullName?.split(" ")[0] || user.username || user.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

      // Small delay of 1.2 seconds to allow the dashboard dashboard animations to load smoothly
      const timer = setTimeout(() => {
        if (typeof window !== "undefined" && "speechSynthesis" in window) {
          const text = `Welcome to NexusFlow, ${name}`;
          const utterance = new SpeechSynthesisUtterance(text);

          // Find a premium natural/google voice if available
          const voices = window.speechSynthesis.getVoices();
          const idealVoice = voices.find(v => v.lang.startsWith("en") && v.name.includes("Natural")) ||
                             voices.find(v => v.lang.startsWith("en") && v.name.includes("Google")) ||
                             voices.find(v => v.lang.startsWith("en"));

          if (idealVoice) {
            utterance.voice = idealVoice;
          }

          utterance.rate = 0.92;  // Elegant assistant cadence
          utterance.pitch = 1.0;  // Standard tone

          window.speechSynthesis.speak(utterance);
          sessionStorage.setItem("nf_welcomed", "true");
        }
      }, 1200);

      return () => clearTimeout(timer);
    }
  }, [user, isLoaded]);
}
