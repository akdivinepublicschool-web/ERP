import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  GraduationCap,
  TrendingUp,
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { cn } from "../utils/cn";
import Skeleton, {
  CardSkeleton,
  TableSkeleton,
} from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Button from "../components/ui/Button";
import api from "../services/api";

const StudentAttendanceDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchStudentDetail();
  }, [studentId]);

  const fetchStudentDetail = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/attendance/student/${studentId}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching student attendance detail:", error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="w-64 h-8 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <TableSkeleton rows={10} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <EmptyState
          title="Student Not Found"
          description="We couldn't find the attendance records for this student."
          icon={User}
          action={
            <Button onClick={() => navigate(-1)} variant="outline">
              Back to Report
            </Button>
          }
        />
      </div>
    );
  }

  const { studentDetails, summary, records } = data;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom duration-700">
      {/* Header & Back Button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 hover:shadow-lg transition-all active:scale-95"
          >
            <ArrowLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight">
              {studentDetails.name}
            </h2>
            <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest mt-1">
              {studentDetails.className} • ROLL NO #{studentDetails.rollNo}
            </p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
            <Calendar size={24} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Total Classes
          </p>
          <h4 className="text-2xl font-black text-gray-900">
            {summary.totalClasses}
          </h4>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-4">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Total Attended
          </p>
          <h4 className="text-2xl font-black text-emerald-600">
            {summary.present}
          </h4>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-4">
            <XCircle size={24} />
          </div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Total Missed
          </p>
          <h4 className="text-2xl font-black text-rose-600">
            {summary.absent}
          </h4>
        </div>

        <div className="bg-white p-6 rounded-[2rem] border border-gray-50 shadow-sm relative overflow-hidden group">
          <div
            className={cn(
              "absolute inset-0 opacity-5",
              parseFloat(summary.percentage) >= 75
                ? "bg-emerald-500"
                : parseFloat(summary.percentage) >= 60
                  ? "bg-amber-500"
                  : "bg-rose-500",
            )}
          />
          <div className="relative z-10">
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
                parseFloat(summary.percentage) >= 75
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100"
                  : parseFloat(summary.percentage) >= 60
                    ? "bg-amber-500 text-white shadow-lg shadow-amber-100"
                    : "bg-rose-500 text-white shadow-lg shadow-rose-100",
              )}
            >
              <TrendingUp size={24} />
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Attendance Percentage
            </p>
            <h4 className="text-2xl font-black text-gray-900">
              {summary.percentage}%
            </h4>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Clock className="text-indigo-600" size={24} />
            Attendance History
          </h3>
          <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Latest Records First
          </div>
        </div>

        <div className="overflow-x-auto">
          {records.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Record Date
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Status
                  </th>
                  <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                    Remarks
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-8 py-5 border-b border-gray-50">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-indigo-200" />
                        <span className="font-bold text-gray-700">
                          {new Date(record.date).toLocaleDateString("en-IN", {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-5 border-b border-gray-50">
                      <span
                        className={cn(
                          "px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest",
                          record.status === "Present"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : record.status === "Absent"
                              ? "bg-rose-50 text-rose-600 border border-rose-100"
                              : "bg-amber-50 text-amber-600 border border-amber-100",
                        )}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-8 py-5 border-b border-gray-50">
                      <p className="text-sm font-medium text-gray-500 truncate max-w-xs italic">
                        {record.remarks || "No remarks provided"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center p-20">
              <EmptyState
                title="No Attendance History"
                description="This student has no attendance records recorded yet."
                icon={Clock}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceDetail;
