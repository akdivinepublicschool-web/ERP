import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  User,
  GraduationCap,
  MapPin,
  Phone,
  ArrowLeft,
  CreditCard,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Printer,
  FileText,
} from "lucide-react";
import api from "../services/api";
import Button from "../components/ui/Button";
import Skeleton from "../components/ui/Skeleton";
import { cn } from "../utils/cn";

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const printRef = useRef();

  const fetchProfile = React.useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        const res = await api.get(`/students/${studentId}/profile`);
        if (res.data.success) {
          setData(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching student profile:", error);
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [studentId],
  );

  useEffect(() => {
    fetchProfile();
    // Silent background refresh every 30 seconds to reflect finance module changes
    const interval = setInterval(() => fetchProfile(true), 30000);
    return () => clearInterval(interval);
  }, [fetchProfile]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-10 w-48 bg-gray-200 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 h-64 bg-gray-200 rounded-[2.5rem]" />
          <div className="md:col-span-2 h-64 bg-gray-200 rounded-[2.5rem]" />
        </div>
        <div className="h-96 bg-gray-200 rounded-[2.5rem]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <AlertCircle size={48} className="text-gray-300" />
        <h2 className="text-2xl font-black text-gray-900">Student Not Found</h2>
        <Button onClick={() => navigate("/students")} icon={ArrowLeft}>
          Back to Directory
        </Button>
      </div>
    );
  }

  const { personalDetails, academicDetails, contactDetails, feeSummary } = data;

  return (
    <div className="min-h-screen bg-gray-50 animate-in fade-in duration-700 pb-12 print:bg-white print:p-0">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-4 md:py-8 space-y-6">
        {/* 1. Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/students")}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800">
                Student Profile
              </h1>
              <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                Last updated: {new Date().toLocaleDateString()} at{" "}
                {new Date().toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
              title="Print Profile"
            >
              <Printer size={16} />
              <span className="hidden xs:inline">Print Profile</span>
            </button>
            <button
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
              title="Download PDF"
            >
              <FileText size={16} />
              <span className="hidden xs:inline">Download PDF</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600">
              <span className="text-xl font-bold">...</span>
            </button>
          </div>
        </div>

        {/* 2. Identity Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start md:items-center gap-4 sm:gap-6 text-center sm:text-left">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg border-4 border-white shrink-0">
              {(personalDetails?.name || "??")
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </div>
            <div className="space-y-2 sm:space-y-1 w-full">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                {personalDetails?.name}
              </h2>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-3">
                <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] sm:text-xs font-bold text-gray-600 border border-gray-200 whitespace-nowrap">
                  Roll No: {personalDetails?.rollNumber}
                </span>
                <span className="px-3 py-1 bg-gray-100 rounded-lg text-[10px] sm:text-xs font-bold text-gray-600 border border-gray-200 whitespace-nowrap">
                  Class: {academicDetails?.className}
                  <sup>th</sup> {academicDetails?.section}
                </span>
                 <span
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] sm:text-xs font-bold text-white uppercase tracking-tight whitespace-nowrap",
                    personalDetails?.status === "active"
                      ? "bg-emerald-600"
                      : "bg-rose-500",
                  )}
                >
                  {personalDetails?.status}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Finance Overview Row */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 overflow-hidden">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight mb-4">
            Finance Overview
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white rounded-full border border-gray-100 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors shadow-sm shrink-0">
                <span className="text-lg sm:text-xl font-bold">₹</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1 truncate">
                  Total Fee
                </p>
                <div className="flex items-end gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                    ₹ {feeSummary?.totalFee.toLocaleString()}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-gray-400 mt-1">
                  ₹ {feeSummary?.totalFee.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white rounded-full border border-emerald-100 flex items-center justify-center text-emerald-600 transition-colors shadow-sm shrink-0">
                <CheckCircle2 size={24} className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1 truncate">
                  Total Paid
                </p>
                <div className="flex items-end gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl font-bold text-emerald-600 truncate">
                    ₹ {feeSummary?.totalPaid.toLocaleString()}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 mt-1">
                  ₹ {feeSummary?.totalPaid.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-rose-50 rounded-xl border border-rose-100 p-4 sm:p-5 flex items-center gap-4 relative overflow-hidden group">
              <div className="w-10 sm:w-12 h-10 sm:h-12 bg-white rounded-full border border-rose-100 flex items-center justify-center text-rose-500 transition-colors shadow-sm shrink-0">
                <AlertCircle
                  size={24}
                  strokeWidth={3}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] sm:text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-1 truncate">
                  Pending Amount
                </p>
                <div className="flex items-end gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl font-bold text-rose-600 truncate">
                    ₹ {feeSummary?.pendingAmount.toLocaleString()}
                  </span>
                </div>
                <p className="text-[9px] sm:text-[10px] font-bold text-rose-400 mt-1">
                  ₹ 5,00,000
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4. Details & Ledger Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Personal Details */}
          <div className="lg:col-span-4 bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-fit">
            <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-4 mb-6 uppercase tracking-tight">
              Personal Details
            </h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                  <User size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 leading-none mb-1">
                    {contactDetails.parentName}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">
                    Father's Name
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 leading-none mb-1">
                    {contactDetails.parentMobile}
                  </p>
                  <p className="text-xs text-gray-400 font-medium">
                    {contactDetails?.address
                      ? contactDetails.address.split(",").pop().trim()
                      : "Location"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 leading-none mb-1">
                    Address
                  </p>
                  <p className="text-xs text-gray-400 font-medium leading-relaxed">
                    {contactDetails.address || "Address not provided"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                  <Calendar size={18} />
                </div>
                <div>
                  <p className="font-bold text-gray-900 leading-none mb-1">
                    Admission Date
                  </p>
                  <p className="text-xs text-gray-400 font-medium uppercase">
                    {new Date(personalDetails.admissionDate).toLocaleDateString(
                      undefined,
                      { year: "numeric", month: "long", day: "numeric" },
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Fee Ledger */}
          <div className="lg:col-span-8 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-tight">
                Fee Ledger
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                Rows per page:
                <select className="bg-transparent text-gray-800 font-bold border-none focus:ring-0 cursor-pointer">
                  <option>10</option>
                  <option>25</option>
                </select>
                <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden ml-2">
                  <button className="p-1 px-2 hover:bg-gray-50 border-r border-gray-200">
                    {"<"}
                  </button>
                  <button className="p-1 px-2 hover:bg-gray-50">{">"}</button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Month
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Fee Amount
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Paid Amount
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
                      Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {feeSummary.monthlyFees.map((fee) => (
                    <tr
                      key={fee.month}
                      className="hover:bg-gray-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">
                        {fee.month}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-400">
                        ₹ {fee.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm font-bold text-gray-900">
                        ₹ {fee.paidAmount.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-tight inline-flex items-center gap-1 border",
                            fee.status === "PAID"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                              : fee.status === "PARTIAL"
                                ? "bg-amber-50 text-amber-700 border-amber-100"
                                : "bg-rose-50 text-rose-700 border-rose-100",
                          )}
                        >
                          <span
                            className={cn(
                              "w-1 h-1 rounded-full",
                              fee.status === "PAID"
                                ? "bg-emerald-600"
                                : fee.status === "PARTIAL"
                                  ? "bg-amber-500"
                                  : "bg-rose-500",
                            )}
                          />
                          {fee.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">
                        {fee.paidOn
                          ? new Date(fee.paidOn).toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 px-6 border-t border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-400 uppercase tracking-tight">
              <span>Rows per page: 10</span>
              <div className="flex items-center gap-6 text-gray-400">
                <span>1-7 of 12</span>
                <div className="flex items-center gap-4">
                  <button className="text-gray-300 hover:text-gray-600 transition-colors">
                    {"<"}
                  </button>
                  <button className="text-gray-800 hover:text-gray-600 transition-colors">
                    {">"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          body {
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .custom-scrollbar::-webkit-scrollbar {
            display: none;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StudentProfile;
