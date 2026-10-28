import React from "react";
import schoolLogo from "../../assets/schoollogo.png";
import schoolConfig from "../../config/school";

const SchoolLogo = ({ className = "w-16 h-16", showText = false }) => {
  return (
    <div className="flex items-center gap-3 select-none">
      <img
        src={schoolLogo}
        alt={`${schoolConfig.name} Logo`}
        className={`${className} rounded-full object-cover border border-gray-100 shadow-sm`}
      />
      {showText && (
        <div className="flex flex-col">
          <span className="font-extrabold text-lg text-gray-800 tracking-tight leading-none">
            {schoolConfig.shortName}
          </span>
          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none mt-1">
            {schoolConfig.displayName.replace(schoolConfig.shortName, "").trim()}
          </span>
        </div>
      )}
    </div>
  );
};

export default SchoolLogo;
