"use client";

import PageHeader from "@/components/PageHeader";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const cohortData = [
  { name: "Evening B", target: 7.5, achieved: 7.1 },
  { name: "Weekend A", target: 7.0, achieved: 6.8 },
  { name: "Morning A", target: 6.5, achieved: 6.7 },
  { name: "Intensive Q2", target: 8.0, achieved: 7.4 },
];

export default function AdminReportsPage() {
  return (
    <div className="animate-fade-in">
      <PageHeader
        eyebrow="Reports"
        title={<>Cohort <span className="gold-text">performance</span></>}
        description="Target vs. average achieved band across active cohorts."
      />

      <div className="panel">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cohortData}>
              <CartesianGrid stroke="#243869" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="#8298c7" tick={{ fontSize: 12 }} />
              <YAxis domain={[5, 9]} stroke="#8298c7" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  background: "#1a2b56",
                  border: "1px solid rgba(201,169,89,0.45)",
                  borderRadius: 12,
                }}
              />
              <Legend />
              <Bar dataKey="target" fill="#e8d595" radius={[6, 6, 0, 0]} />
              <Bar dataKey="achieved" fill="#c9a959" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
