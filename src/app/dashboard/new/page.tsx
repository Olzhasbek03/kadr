import { config } from "@/lib/config";
import NewEventForm from "@/components/dashboard/NewEventForm";

export default function NewEventPage() {
  return <NewEventForm defaultMaxGuests={config.defaultMaxGuests} />;
}
