import About from '@/components/About';
import CTA from '@/components/CTA';
import Contact from '@/components/Contact';
import Features from '@/components/Features';
import Footer from '@/components/Footer';
import Hero from '@/components/Hero';
import Loader from '@/components/Loader';
import Navbar from '@/components/Navbar';
import Stats from '@/components/Stats';

export default function Home() {
  return (
    <>
      <Loader />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Features />
        <Stats />
        <CTA />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
