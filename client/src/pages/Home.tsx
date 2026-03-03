import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Zap, Shield } from "lucide-react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (isAuthenticated) {
    setLocation("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900">TaskFlow</h1>
          <div className="space-x-4">
            <Button variant="outline" onClick={() => setLocation("/login")}>
              Login
            </Button>
            <Button onClick={() => setLocation("/register")}>
              Sign Up
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-20 text-center">
        <h2 className="text-5xl font-bold text-slate-900 mb-6">
          Manage Your Tasks Effortlessly
        </h2>
        <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
          TaskFlow is a simple, secure task management application that helps you stay organized
          and productive. Create, edit, and track your tasks with ease.
        </p>
        <div className="space-x-4">
          <Button size="lg" onClick={() => setLocation("/register")}>
            Get Started
          </Button>
          <Button size="lg" variant="outline" onClick={() => setLocation("/login")}>
            Login
          </Button>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h3 className="text-3xl font-bold text-slate-900 text-center mb-12">
          Why Choose TaskFlow?
        </h3>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-lg border border-slate-200">
            <CheckCircle2 className="h-12 w-12 text-green-600 mb-4" />
            <h4 className="text-xl font-semibold text-slate-900 mb-2">
              Easy Task Management
            </h4>
            <p className="text-slate-600">
              Create, edit, and delete tasks with a clean and intuitive interface. Mark tasks as
              pending, in-progress, or completed.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-lg border border-slate-200">
            <Shield className="h-12 w-12 text-blue-600 mb-4" />
            <h4 className="text-xl font-semibold text-slate-900 mb-2">
              Secure & Private
            </h4>
            <p className="text-slate-600">
              Your tasks are encrypted and stored securely. Only you can access your personal
              task list with JWT-based authentication.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-lg border border-slate-200">
            <Zap className="h-12 w-12 text-yellow-600 mb-4" />
            <h4 className="text-xl font-semibold text-slate-900 mb-2">
              Fast & Reliable
            </h4>
            <p className="text-slate-600">
              Built with modern technology for speed and reliability. Your data persists across
              sessions automatically.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h3 className="text-3xl font-bold mb-4">Ready to Get Organized?</h3>
          <p className="text-lg mb-8 opacity-90">
            Start managing your tasks today with TaskFlow
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => setLocation("/register")}
          >
            Create Your Account
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-300 py-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>&copy; 2024 TaskFlow. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
