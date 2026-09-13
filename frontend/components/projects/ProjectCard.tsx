"use client";

import React from "react";
import Link from "next/link";
import { FolderGit2, Star, GitFork, ArrowRight, ExternalLink } from "lucide-react";

export interface ProjectCardProps {
  id: string;
  title: string;
  description: string;
  tags?: string[];
  stars?: number;
  repoUrl?: string;
  demoUrl?: string;
  href?: string;
}

export function ProjectCard({
  id,
  title,
  description,
  tags = [],
  stars = 0,
  repoUrl,
  demoUrl,
  href = `/dashboard/student/projects/${id}`,
}: ProjectCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <FolderGit2 className="w-5 h-5" />
          </div>
          {stars > 0 && (
            <span className="flex items-center text-xs text-amber-600 font-medium bg-amber-50 px-2 py-0.5 rounded-full">
              <Star className="w-3.5 h-3.5 mr-1 fill-amber-500 text-amber-500" />
              {stars}
            </span>
          )}
        </div>

        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1">{title}</h3>
        <p className="text-sm text-gray-600 mb-4 line-clamp-3 leading-relaxed">{description}</p>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-gray-100">
            {tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-gray-600 hover:text-gray-900 flex items-center"
            >
              <GitFork className="w-3.5 h-3.5 mr-1" />
              Code
            </a>
          )}
          {demoUrl && (
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 flex items-center ml-2"
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" />
              Demo
            </a>
          )}
        </div>

        <Link
          href={href}
          className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors"
        >
          <span>Details</span>
          <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Link>
      </div>
    </div>
  );
}
