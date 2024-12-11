import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import styles from "../styles/Home.module.css";
import { App } from "../lib/app";

export default function Home() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const nested = async () => {
      const app = new App(canvasRef.current, document);
      await app.Initialize();
      app.run();
    };
    nested();
  }, []);

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main>
        <canvas width="800" height="600" ref={canvasRef}></canvas>
      </main>
    </div>
  );
}
