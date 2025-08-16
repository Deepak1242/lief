"use client";
import { ApolloClient, InMemoryCache, HttpLink, ApolloProvider } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { SessionProvider } from "next-auth/react";
import { ConfigProvider, App as AntApp, theme } from "antd";
import { AuthProvider } from "@/contexts/AuthContext";

const httpLink = new HttpLink({ uri: "/api/graphql", credentials: "include" });

// In development, allow impersonating a user via localStorage headers
// window.localStorage keys: devEmail, devRole (e.g., ADMIN or CAREWORKER)
const devAuthLink = setContext((_, { headers }) => {
  if (typeof window === "undefined") return { headers };
  const devEmail = window.localStorage.getItem("devEmail");
  const devRole = window.localStorage.getItem("devRole");
  const extra = {};
  if (devEmail) extra["x-email"] = devEmail;
  if (devRole) extra["x-role"] = devRole;
  return { headers: { ...headers, ...extra } };
});

const client = new ApolloClient({
  link: devAuthLink.concat(httpLink),
  cache: new InMemoryCache(),
});

export default function Providers({ children }) {
  return (
    <SessionProvider>
      <ApolloProvider client={client}>
        <AuthProvider>
          <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
            <AntApp>{children}</AntApp>
          </ConfigProvider>
        </AuthProvider>
      </ApolloProvider>
    </SessionProvider>
  );
}
