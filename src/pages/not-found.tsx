import { Button } from "@/components/ui/button";
import { routesPath } from "@/routes/routesPath";
import { ArrowLeft, Home, Search } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { SchoolMark } from "@/components/school-mark";
import { currentSchoolSlug } from "@/utils/school-host";
import { schoolLogoUrl } from "@/utils/school-brand";
import { SUPPORT_MAIL } from "@/utils/static";

/**
 * The catch-all page for an address the app does not route.
 *
 * The header mark is the logo of the school the address names, and the XVS
 * shield where that school has none or the address names no school. It is
 * resolved from the address rather than the session because this route sits
 * outside the signed-in shell, so a session may not be loaded here.
 */
export default function NotFound() {
  const navigate = useNavigate();
  const logoUrl = schoolLogoUrl(currentSchoolSlug());
  return (
    <div className="min-h-screen w-full bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-3 px-6 flex items-center">
        <div className="flex items-center gap-2">
          <SchoolMark
            logo={logoUrl || null}
            alt={logoUrl ? "School logo" : "XVS"}
            size={36}
            animate={false}
          />
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search Keyword#"
              className="pl-10 pr-4 py-2 rounded-full border border-gray-200 w-64 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled
            />
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md text-center">
          <div className="relative">
            <div className="text-[150px] font-bold text-gray-200 leading-none">
              404
            </div>
            <div className="absolute top-[56%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
              <span className="text-gray-400 text-4xl">?</span>
            </div>
          </div>

          <h2 className="mt-6 text-2xl font-semibold text-gray-800">
            Page not found
          </h2>
          <p className="mt-3 text-gray-600">
            We couldn't find the page you're looking for. It might have been
            moved, deleted, or never existed.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to={routesPath.AUTH.LOGIN}>
              <Button className="">
                <Home />
                Go to Home
              </Button>
            </Link>
            <Button onClick={() => navigate(-1)} variant="outline" className="">
              <ArrowLeft />
              <span>Go Back</span>
            </Button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Need help?
              <a
                href={`mailto:${SUPPORT_MAIL}`}
                className="text-primary hover:underline"
              >
                Contact our support team
              </a>
            </p>
          </div>
        </div>
      </div>

      <footer className="bg-white border-t border-gray-200 py-4 px-6 text-center text-sm text-gray-500">
        <p>
          &copy; {new Date().getFullYear()} Codex Vision. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
