import { createClient } from "@/lib/supabase/server";

export default async function TestConnectionPage() {
  const supabase = await createClient();

  // Test the connection by querying the database
  const { data, error } = await supabase.from("users").select("count");

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-md w-full space-y-4">
        <h1 className="text-2xl font-bold">Connection Test</h1>

        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold">Supabase Connection</h2>
          {error ? (
            <div className="text-red-600">
              <p className="font-medium">❌ Connection Failed</p>
              <p className="text-sm mt-2">Error: {error.message}</p>
              <p className="text-xs mt-2 text-gray-500">
                This is expected if you haven&apos;t created the tables yet.
              </p>
            </div>
          ) : (
            <div className="text-green-600">
              <p className="font-medium">✅ Connection Successful</p>
              <p className="text-sm mt-2">
                Supabase is connected and working!
              </p>
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-2">
          <h2 className="font-semibold">Environment Variables</h2>
          <div className="text-sm space-y-1">
            <p>
              SUPABASE_URL:{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_URL ? "✅ Set" : "❌ Missing"}
            </p>
            <p>
              SUPABASE_ANON_KEY:{" "}
              {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                ? "✅ Set"
                : "❌ Missing"}
            </p>
            <p>
              GOOGLE_CLIENT_ID:{" "}
              {process.env.GOOGLE_CLIENT_ID ? "✅ Set" : "❌ Missing"}
            </p>
            <p>
              GOOGLE_CLIENT_SECRET:{" "}
              {process.env.GOOGLE_CLIENT_SECRET ? "✅ Set" : "❌ Missing"}
            </p>
            <p>
              NEXTAUTH_SECRET:{" "}
              {process.env.NEXTAUTH_SECRET ? "✅ Set" : "❌ Missing"}
            </p>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>
            Visit this page at:{" "}
            <code className="bg-gray-100 px-2 py-1 rounded">
              http://localhost:3000/test-connection
            </code>
          </p>
        </div>
      </div>
    </div>
  );
}
