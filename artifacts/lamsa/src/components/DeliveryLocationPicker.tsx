import { useEffect, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

const SANA_A_CENTER: [number, number] = [15.3694, 44.1910];
const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41],
});

type Props = { latitude: number | null; longitude: number | null; onChange: (latitude: number, longitude: number) => void };

function MapClickHandler({ onChange }: { onChange: Props["onChange"] }) {
  useMapEvents({ click: event => onChange(event.latlng.lat, event.latlng.lng) });
  return null;
}

function RecenterMap({ position }: { position: [number, number] }) {
  const map = useMap();
  useEffect(() => { map.setView(position, Math.max(map.getZoom(), 14)); }, [map, position]);
  return null;
}

export function DeliveryLocationPicker({ latitude, longitude, onChange }: Props) {
  const [locating, setLocating] = useState(false);
  const position: [number, number] = latitude != null && longitude != null ? [latitude, longitude] : SANA_A_CENTER;

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { onChange(coords.latitude, coords.longitude); setLocating(false); },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return <div className="space-y-3">
    <div className="flex items-center justify-between gap-3">
      <div><p className="font-bold text-[#1A1A1A] flex items-center gap-2"><MapPin className="w-4 h-4 text-[#D81B60]" /> موقع التوصيل على الخريطة</p><p className="text-xs text-[#6B6B6B] mt-1">اضغط على الخريطة أو اسحب المؤشر إلى المكان الدقيق</p></div>
      <button type="button" onClick={locateMe} disabled={locating} className="inline-flex items-center gap-2 rounded-xl border border-[#F0D4E5] bg-white px-3 py-2 text-xs font-bold text-[#D81B60] hover:bg-[#FFF0F6] disabled:opacity-60"><LocateFixed className="w-4 h-4" />{locating ? "جاري التحديد..." : "موقعي الحالي"}</button>
    </div>
    <div className="h-72 overflow-hidden rounded-2xl border-2 border-[#F0D4E5] relative z-0">
      <MapContainer center={position} zoom={13} scrollWheelZoom className="h-full w-full">
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapClickHandler onChange={onChange} />
        <RecenterMap position={position} />
        {latitude != null && longitude != null && <Marker position={position} icon={markerIcon} draggable eventHandlers={{ dragend: event => { const marker = event.target as L.Marker; const point = marker.getLatLng(); onChange(point.lat, point.lng); } }} />}
      </MapContainer>
    </div>
    {latitude != null && longitude != null ? <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-3 py-2" dir="ltr">تم تحديد الموقع: {latitude.toFixed(6)}, {longitude.toFixed(6)}</p> : <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">يجب تحديد نقطة التوصيل على الخريطة قبل إرسال الطلب</p>}
  </div>;
}
