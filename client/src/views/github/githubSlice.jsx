import React from "react";
import { apiSlice } from "../../app/api/apiSlice";

export const githubApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        createIssue: builder.mutation({
            query: (issueData) => ({
                url: "/github/createIssue",
                method: "POST",
                body: issueData,
            }),
        }),
    
    }),
});

export const { useCreateIssueMutation } = githubApiSlice;