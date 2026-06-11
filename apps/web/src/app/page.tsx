import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          <span className="text-blue-500">Deseo</span> SEO Platform
        </h1>
        <p className="text-xl text-slate-300">
          AI-powered content generation and SEO optimization
        </p>
        
        <Link
          href="/dashboard"
          className="rounded-lg bg-blue-600 px-8 py-3 text-lg font-semibold transition hover:bg-blue-700"
        >
          Go to Dashboard
        </Link>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          <FeatureCard
            title="AI Content"
            description="Generate SEO-optimized articles with AI"
            icon="✨"
          />
          <FeatureCard
            title="Multi-CMS"
            description="Publish to Payload, WordPress, Strapi"
            icon="🚀"
          />
          <FeatureCard
            title="SEO Analysis"
            description="Automated PR-based SEO improvements"
            icon="📊"
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: string;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-xl bg-white/10 p-6 backdrop-blur-sm transition hover:bg-white/20">
      <div className="text-4xl">{icon}</div>
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="text-slate-300">{description}</p>
    </div>
  );
}
