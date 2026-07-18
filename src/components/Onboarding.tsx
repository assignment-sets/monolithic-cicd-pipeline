// src/components/Onboarding.tsx
"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, GraduationCap, ShieldAlert, UserCheck } from "lucide-react";

interface Department {
  id: string;
  name: string;
}

interface OnboardingProps {
  user: any;
  onComplete: (role: string) => void;
}

export default function Onboarding({ user, onComplete }: OnboardingProps) {
  const [name, setName] = useState(
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim()
  );
  const [role, setRole] = useState<"ADMIN" | "STUDENT" | "">("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch departments if role is STUDENT
  useEffect(() => {
    if (role === "STUDENT") {
      const fetchDeps = async () => {
        setLoadingDeps(true);
        setError(null);
        try {
          const res = await fetch("/api/v1/departments");
          if (!res.ok) throw new Error("Failed to load departments.");
          const data = await res.json();
          setDepartments(data.departments || []);
          if (data.departments && data.departments.length > 0) {
            setDepartmentId(data.departments[0].id);
          }
        } catch (err: any) {
          setError(err.message || "Error fetching departments.");
        } finally {
          setLoadingDeps(false);
        }
      };
      fetchDeps();
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) {
      setError("Please select a role.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (role === "STUDENT" && !departmentId) {
      setError("Please select a department.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/auth/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, name, departmentId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Onboarding failed.");
      }

      onComplete(role);
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex items-center justify-center py-10 px-4">
      <Card className="max-w-xl w-full shadow-2xl border border-gray-100 rounded-2xl overflow-hidden bg-white">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <CardHeader className="space-y-1 pt-8 px-8 pb-6 text-center bg-gray-50/50 border-b border-gray-100">
          <CardTitle className="text-3xl font-extrabold tracking-tight text-gray-900">
            Complete Registration
          </CardTitle>
          <CardDescription className="text-gray-500 text-base">
            Set up your account profile to access the portal.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-md text-sm">
                <p className="font-semibold">Error:</p>
                <p>{error}</p>
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-3">
              <Label className="text-base font-bold text-gray-800">I am registering as a:</Label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole("ADMIN")}
                  className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 text-center transition-all ${
                    role === "ADMIN"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 text-gray-600"
                  }`}
                >
                  <ShieldAlert className={`h-8 w-8 mb-2 ${role === "ADMIN" ? "text-indigo-600" : "text-gray-400"}`} />
                  <span className="font-bold text-sm block">Administrator</span>
                  <span className="text-xs text-gray-400 mt-1 block">Manage portal and student profiles</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("STUDENT")}
                  className={`flex flex-col items-center justify-center p-5 rounded-xl border-2 text-center transition-all ${
                    role === "STUDENT"
                      ? "border-indigo-600 bg-indigo-50/50 text-indigo-700 shadow-md"
                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 text-gray-600"
                  }`}
                >
                  <GraduationCap className={`h-8 w-8 mb-2 ${role === "STUDENT" ? "text-indigo-600" : "text-gray-400"}`} />
                  <span className="font-bold text-sm block">Student</span>
                  <span className="text-xs text-gray-400 mt-1 block">View profile and class enrollment</span>
                </button>
              </div>
            </div>

            {role && (
              <div className="space-y-4 animate-in fade-in-50 slide-in-from-bottom-5 duration-300">
                {/* Full Name */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-semibold text-gray-700">Full Name</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="e.g. John Doe"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="pl-3 h-11 border-gray-200 rounded-lg focus-visible:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Department Selection (Students Only) */}
                {role === "STUDENT" && (
                  <div className="space-y-2">
                    <Label htmlFor="department" className="font-semibold text-gray-700">Department</Label>
                    {loadingDeps ? (
                      <div className="flex items-center space-x-2 text-sm text-gray-500 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        <span>Loading departments...</span>
                      </div>
                    ) : departments.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs space-y-1">
                        <p className="font-semibold">No departments found in the system.</p>
                        <p>You cannot register as a student until an administrator creates a department.</p>
                        <p className="font-bold text-indigo-700 mt-1">Tip: Log in as an Administrator first to add departments.</p>
                      </div>
                    ) : (
                      <Select value={departmentId} onValueChange={setDepartmentId}>
                        <SelectTrigger className="h-11 border-gray-200 rounded-lg focus-visible:ring-indigo-500">
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={submitting || !role || (role === "STUDENT" && departments.length === 0)}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-5 w-5" />
                  <span>Complete Setup</span>
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
