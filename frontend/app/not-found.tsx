import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white">404</h1>
        <p className="text-gray-500">Page not found</p>
        <Link href="/" className="text-blue-500 hover:underline text-sm">← Go home</Link>
      </div>
    </div>
  );
}