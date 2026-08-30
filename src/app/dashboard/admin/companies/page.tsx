"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Loader2, Search, Building2, ExternalLink } from "lucide-react";

type CompanyData = {
  id: string;
  email: string;
  companyName: string;
  industry: string;
  website: string;
  contactPerson: string;
  status: string;
};

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<CompanyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch users with role 'company'
        const usersSnap = await getDocs(query(collection(db, "users"), where("role", "==", "company")));
        const userDocs: Record<string, any> = {};
        usersSnap.forEach(d => {
          userDocs[d.id] = { id: d.id, ...d.data() };
        });

        // Fetch company profiles
        const profilesSnap = await getDocs(collection(db, "companyProfiles"));
        const profileDocs: Record<string, any> = {};
        profilesSnap.forEach(d => {
          profileDocs[d.id] = { id: d.id, ...d.data() };
        });

        // Merge
        const merged: CompanyData[] = Object.keys(userDocs).map(uid => {
          const user = userDocs[uid];
          const profile = profileDocs[uid] || {};
          return {
            id: uid,
            email: user.email || "N/A",
            companyName: profile.companyName || "Incomplete Profile",
            industry: profile.industry || "N/A",
            website: profile.website || "N/A",
            contactPerson: profile.contactPerson || "N/A",
            status: "Active", // profile.verificationStatus could be used here
          };
        });

        setCompanies(merged);
      } catch (error) {
        console.error("Error fetching companies:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCompanies = useMemo(() => {
    if (!searchQuery) return companies;
    const lower = searchQuery.toLowerCase();
    return companies.filter(
      (c) =>
        c.companyName.toLowerCase().includes(lower) ||
        c.email.toLowerCase().includes(lower) ||
        c.industry.toLowerCase().includes(lower) ||
        c.contactPerson.toLowerCase().includes(lower)
    );
  }, [companies, searchQuery]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Companies</h1>
          <p className="mt-2 text-gray-600">Manage and view registered companies on the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, email, industry..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company Details
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Industry & Website
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact Person
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCompanies.length > 0 ? (
                filteredCompanies.map((company) => (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-md flex items-center justify-center text-purple-600 font-bold">
                          <Building2 className="h-5 w-5" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{company.companyName}</div>
                          <div className="text-sm text-gray-500">{company.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.industry}</div>
                      {company.website !== "N/A" && (
                        <a 
                          href={company.website.startsWith('http') ? company.website : `https://${company.website}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center mt-1"
                        >
                          Visit Website <ExternalLink className="h-3 w-3 ml-1" />
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{company.contactPerson}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        {company.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                    <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No companies found</p>
                    <p className="text-sm text-gray-500">Try adjusting your search criteria.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
