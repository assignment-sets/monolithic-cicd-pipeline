// components/Admin/StudentForm.tsx
"use client";

import { useState, useEffect } from "react";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface Props {
  initialData?: any;
  onSubmitSuccess: () => void;
  onCancel?: () => void;
}

export default function StudentForm({
  initialData,
  onSubmitSuccess,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialData?.name || "");
  const [email, setEmail] = useState(initialData?.user?.email || "");
  const [password, setPassword] = useState(""); // only for create
  const [departmentId, setDepartmentId] = useState(
    initialData?.department?.id || ""
  );
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch departments on mount
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch("/api/v1/departments");
        const data = await res.json();
        const deps = data.departments || [];
        setDepartments(deps);
        
        // Auto-select the first department if not editing and deps are available
        if (deps.length > 0 && !departmentId) {
          setDepartmentId(deps[0].id);
        }
      } catch (err) {
        console.error("Failed to fetch departments", err);
      }
    };
    fetchDepartments();
  }, [departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = initialData
        ? `/api/v1/admin/students/${initialData.userId}`
        : `/api/v1/admin/students`;
      const method = initialData ? "PUT" : "POST";
      const body: any = { name, departmentId };
      if (!initialData) {
        body.email = email;
        body.password = password;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save student");
      }

      onSubmitSuccess();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <Label>Name</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>
      {!initialData && (
        <>
          <div>
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </>
      )}
      <div>
        <Label>Department</Label>
        <Select value={departmentId} onValueChange={setDepartmentId} required>
          <SelectTrigger>
            <SelectValue placeholder="Select department" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading
            ? "Saving..."
            : initialData
            ? "Update Student"
            : "Create Student"}
        </Button>
      </div>
    </form>
  );
}
