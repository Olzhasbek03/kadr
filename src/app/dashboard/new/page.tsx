import { config } from "@/lib/config";
import NewEventForm from "@/components/dashboard/NewEventForm";

/** Server wrapper: pricing config lives in server env, the form is client. */
export default function NewEventPage() {
  return (
    <NewEventForm priceKzt={config.eventPriceKzt} freeGuestLimit={config.freeGuestLimit} />
  );
}
